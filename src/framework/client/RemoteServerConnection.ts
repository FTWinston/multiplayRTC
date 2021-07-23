import { ServerConnection, ConnectionParameters } from './ServerConnection';
import {
    eventMessageIdentifier,
    deltaStateMessageIdentifier,
    fullStateMessageIdentifier,
    errorMessageIdentifier,
    ServerToClientMessage,
    IEvent,
} from '../shared/ServerToClientMessage';
import { acknowledgeMessageIdentifier } from '../shared/ClientToServerMessage';
import { IConnectionSettings } from '../shared/SignalConnection';
import { ClientSignalConnection } from './ClientSignalConnection';

export interface RemoteConnectionParameters<
    TServerEvent,
    TClientState extends {},
    TLocalState extends {} = {}
> extends ConnectionParameters<TServerEvent, TClientState, TLocalState> {
    sessionId: string;
    clientName: string;
    signalSettings: IConnectionSettings;
    ready: () => void;
}

export class RemoteServerConnection<
    TClientCommand,
    TServerEvent,
    TClientState extends {},
    TLocalState extends {} = {}
> extends ServerConnection<
    TClientCommand,
    TServerEvent,
    TClientState,
    TLocalState
> {
    private reliable: RTCDataChannel;
    private unreliable: RTCDataChannel;
    private peer?: RTCPeerConnection;
    private clientName: string;

    constructor(
        params: RemoteConnectionParameters<
            TServerEvent,
            TClientState,
            TLocalState
        >
    ) {
        super(params);
        this.clientName = params.clientName;

        console.log(`connecting to server ${params.sessionId}...`);

        const signal = new ClientSignalConnection(
            params.signalSettings,
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
                    const data = JSON.parse(
                        event.data
                    ) as ServerToClientMessage<TServerEvent>;

                    switch (data[0]) {
                        case fullStateMessageIdentifier:
                            this.receiveFullState(JSON.parse(data[1]));
                            break;

                        case deltaStateMessageIdentifier:
                            this.receiveDeltaState(data[1]);
                            break;

                        case eventMessageIdentifier:
                            this.receiveEvent(data[1]);
                            break;
                        case errorMessageIdentifier:
                            this.receiveError(data[1]);
                            this.disconnect();
                            break;
                        default:
                            console.log(
                                'Unrecognised reliable message from server',
                                event.data
                            );
                            break;
                    }
                };

                this.reliable.onclose = () => this.disconnect();

                ready();
            } else if (event.channel.label === 'unreliable') {
                this.unreliable = event.channel;

                this.unreliable.onmessage = (event) => {
                    const data = JSON.parse(
                        event.data
                    ) as ServerToClientMessage<TServerEvent>;
                    switch (data[0]) {
                        case fullStateMessageIdentifier:
                            this.sendAcknowledgement(data[2]);
                            this.receiveFullState(JSON.parse(data[1]));
                            break;

                        case deltaStateMessageIdentifier:
                            this.sendAcknowledgement(data[2]);
                            this.receiveDeltaState(data[1]);
                            break;

                        default:
                            console.log(
                                'Unrecognised unreliable message from server',
                                event.data
                            );
                            break;
                    }
                };
            } else {
                console.log(
                    `Unexpected data channel opened by server: ${event.channel.label}`
                );
            }
        };
    }

    sendCommand(command: TClientCommand) {
        this.reliable.send(JSON.stringify([eventMessageIdentifier, command]));
    }

    sendAcknowledgement(time: number) {
        this.unreliable?.send(
            JSON.stringify([acknowledgeMessageIdentifier, time])
        );
    }

    disconnect() {
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
