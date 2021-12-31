import { ServerConnection, ConnectionParameters } from './ServerConnection';
import { ServerToClientMessage } from '../shared/ServerToClientMessage';
import { ClientToServerMessageType } from '../shared/ClientToServerMessage';
import { IConnectionConfig } from '../shared/SignalConnection';
import { ClientSignalConnection } from './ClientSignalConnection';
import { stringify } from 'enhancejson';
import { parse } from 'enhancejson';

export interface RemoteConnectionParameters<TServerEvent>
    extends ConnectionParameters<TServerEvent> {
    sessionId: string;
    clientName: string;
    connectionConfig: IConnectionConfig;
    ready: () => void;
}

export class RemoteServerConnection<
    TClientCommand,
    TServerEvent
> extends ServerConnection<TClientCommand, TServerEvent> {
    private reliable: RTCDataChannel;
    private unreliable: RTCDataChannel;
    private peer?: RTCPeerConnection;
    private clientName: string;

    constructor(params: RemoteConnectionParameters<TServerEvent>) {
        super(params);
        this.clientName = params.clientName;

        console.log(`connecting to server ${params.sessionId}...`);

        const signal = new ClientSignalConnection(
            params.connectionConfig,
            params.sessionId,
            params.clientName,
            (peer) => {
                this.peer = peer;
                console.log(`connected to session ${params.sessionId}`);
                this._sessionId = params.sessionId;

                this.setupPeer(peer, params.ready);
            },
            () => {
                if (!this.reliable) {
                    // TODO: FLAG THIS UP ... report on the close reason!
                    console.log('disconnected from signal server');
                }
            }
        );
    }

    private setupPeer(peer: RTCPeerConnection, ready: () => void) {
        peer.ondatachannel = (event) => {
            if (event.channel.label === 'reliable') {
                this.reliable = event.channel;

                this.reliable.onmessage = (event) => {
                    const message = parse(
                        event.data
                    ) as ServerToClientMessage<TServerEvent>;

                    this.receiveMessageFromServer(message);
                };

                this.reliable.onclose = () => this.disconnect();

                ready();
            } else if (event.channel.label === 'unreliable') {
                this.unreliable = event.channel;

                this.unreliable.onmessage = (event) => {
                    const message = parse(
                        event.data
                    ) as ServerToClientMessage<TServerEvent>;

                    this.receiveMessageFromServer(message);
                };
            } else {
                console.log(
                    `Unexpected data channel opened by server: ${event.channel.label}`
                );
            }
        };
    }

    public override sendCommand(command: TClientCommand) {
        this.reliable.send(
            stringify([ClientToServerMessageType.Command, command])
        );
    }

    public override sendAcknowledge(time: number) {
        this.unreliable?.send(
            stringify([ClientToServerMessageType.Acknowledge, time])
        );
    }

    public override sendQuit() {
        this.reliable?.send(stringify([ClientToServerMessageType.Quit]));
    }

    disconnect() {
        this.sendQuit();

        this.reliable.close();
        this.unreliable?.close();
        this.peer?.close();
    }

    get localId() {
        return this.clientName;
    }

    get sessionId() {
        return this._sessionId;
    }

    private _sessionId: string = '';
}
