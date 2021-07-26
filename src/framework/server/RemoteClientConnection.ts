import { stringify } from 'enhancejson/lib/stringify';
import { IServerToClientConnection } from './IServerToClientConnection';
import {
    ServerToClientMessage,
    ServerToClientMessageType,
} from '../shared/ServerToClientMessage';
import { ClientToServerMessage } from '../shared/ClientToServerMessage';

export class RemoteClientConnection<TClientCommand, TServerEvent>
    implements IServerToClientConnection<TClientCommand, TServerEvent>
{
    private readonly reliable: RTCDataChannel;
    private unreliable?: RTCDataChannel;

    constructor(
        readonly clientName: string,
        private readonly peer: RTCPeerConnection,
        connected: (
            connection: RemoteClientConnection<TClientCommand, TServerEvent>
        ) => void,
        private readonly disconnected: (
            connection: RemoteClientConnection<TClientCommand, TServerEvent>
        ) => void
    ) {
        this.reliable = peer.createDataChannel('reliable', {
            ordered: true,
        });

        this.reliable.onopen = () => {
            connected(this);
        };

        this.setupDataChannel(this.reliable);

        this.peer.onconnectionstatechange = () => {
            if (this.peer.connectionState !== 'connected') {
                this.reportDisconnected();
            }
        };
    }

    private setupDataChannel(channel: RTCDataChannel) {
        channel.onclose = () => this.reportDisconnected();

        channel.onerror = (error) => {
            this.disconnect();
            if (error.error.code !== 0) {
                console.error(
                    `Error ${error.error.code} in connection to client ${this.clientName}: ${error.error.message}`
                );
            }
        };

        channel.onmessage = (event) => {
            const data = JSON.parse(
                event.data
            ) as ClientToServerMessage<TClientCommand>;

            this.receiveCallback(data);
        };
    }

    finishConnecting() {
        this.unreliable = this.peer.createDataChannel('unreliable', {
            ordered: false,
            maxRetransmits: 0,
        });

        this.setupDataChannel(this.unreliable);
    }

    send(message: ServerToClientMessage<TServerEvent>): void {
        const channel =
            this.shouldSendReliably(message[0]) || !this.unreliable
                ? this.reliable
                : this.unreliable;

        channel.send(stringify(message));
    }

    private shouldSendReliably(messageType: ServerToClientMessageType) {
        return (
            this.unreliable === undefined ||
            (messageType !== ServerToClientMessageType.DeltaState &&
                messageType !== ServerToClientMessageType.FullState)
        );
    }

    private receiveCallback: (
        message: ClientToServerMessage<TClientCommand>
    ) => void;

    connect(
        messageCallback: (
            message: ClientToServerMessage<TClientCommand>
        ) => void
    ) {
        // TODO: something

        this.receiveCallback = messageCallback;
    }

    disconnect(): void {
        this.reliable.close();
        this.unreliable?.close();

        if (this.peer.connectionState === 'connected') {
            this.peer.close();
        }
    }

    private hasDisconnected = false;
    private reportDisconnected() {
        if (this.hasDisconnected) {
            return;
        }

        this.hasDisconnected = true;
        this.disconnected(this);
    }
}
