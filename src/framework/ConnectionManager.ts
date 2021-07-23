import { OfflineConnectionParameters } from './client/OfflineServerConnection';
import { ServerToClientMessage } from './shared/ServerToClientMessage';
import {
    ServerWorkerMessageIn,
    ServerWorkerMessageInType,
} from './ServerWorkerMessageIn';
import { ServerSignalConnection } from './server/ServerSignalConnection';
import { IServerToClientConnection } from './server/IServerToClientConnection';
import { RemoteClientConnection } from './server/RemoteClientConnection';
import { IConnectionSettings } from './shared/SignalConnection';

export interface ServerPeerParameters<TServerEvent, TClientState>
    extends OfflineConnectionParameters<TServerEvent, TClientState> {
    initialClientState: TClientState;
    clientName: string;
}

export class ConnectionManager<TClientCommand, TServerEvent, TClientState> {
    private signal: ServerSignalConnection;
    private readonly clients = new Map<
        string,
        IServerToClientConnection<TClientCommand, TServerEvent>
    >();

    constructor(
        private readonly sendToServer: (
            message: ServerWorkerMessageIn<TClientCommand>
        ) => void,
        ready: (sessionID: string) => void,
        signalSettings: IConnectionSettings,
        localClient?: IServerToClientConnection<TClientCommand, TServerEvent>
    ) {
        this.signal = new ServerSignalConnection(
            signalSettings,
            ready,
            (name) => this.isNameAllowed(name),
            (name, peer) => this.remoteClientJoining(name, peer),
            () => this.signalDisconnected()
        );

        if (localClient) {
            this.clients.set(localClient.clientName, localClient);
        }
    }

    private signalDisconnected() {}

    private isNameAllowed(name: string) {
        if (this.clients.has(name)) {
            return false;
        }

        if (name.length === 0) {
            return false;
        }

        if (name.length > 20) {
            return false;
        }

        return true;
    }

    private remoteClientJoining(name: string, peer: RTCPeerConnection) {
        const client: RemoteClientConnection<TClientCommand, TServerEvent> =
            new RemoteClientConnection<TClientCommand, TServerEvent>(
                name,
                peer,
                () => this.clientConnected(client),
                () => this.clientDisconnected(client),
                (time) => this.clientAcknowledged(client, time),
                (command) => this.clientCommand(client, command)
            );

        this.clients.set(name, client);
    }

    // This doesn't apply to local client, that's handled in LocalServerConnection
    private clientConnected(
        client: IServerToClientConnection<TClientCommand, TServerEvent>
    ) {
        this.sendToServer({
            type: ServerWorkerMessageInType.Join,
            who: client.clientName,
        });
    }

    // This doesn't apply to local client, that's handled in LocalServerConnection
    private clientDisconnected(
        client: IServerToClientConnection<TClientCommand, TServerEvent>
    ) {
        this.sendToServer({
            type: ServerWorkerMessageInType.Quit,
            who: client.clientName,
        });

        this.clients.delete(client.clientName);
    }

    // This doesn't apply to local client, that's handled in LocalServerConnection
    private clientAcknowledged(
        client: IServerToClientConnection<TClientCommand, TServerEvent>,
        time: number
    ) {
        this.sendToServer({
            type: ServerWorkerMessageInType.Acknowledge,
            who: client.clientName,
            time,
        });
    }

    // This doesn't apply to local client, that's handled in LocalServerConnection
    private clientCommand(
        client: IServerToClientConnection<TClientCommand, TServerEvent>,
        command: TClientCommand
    ) {
        this.sendToServer({
            type: ServerWorkerMessageInType.Command,
            who: client.clientName,
            command,
        });
    }

    public sendToClient(
        client: string | undefined,
        message: ServerToClientMessage<TServerEvent>
    ) {
        if (client === undefined) {
            for (const conn of this.clients.values()) {
                conn.send(message);
            }
        } else {
            this.clients.get(client)?.send(message);
        }
    }

    public disconnect(client?: string) {
        if (client === undefined) {
            for (const conn of this.clients.values()) {
                conn.disconnect();
            }

            this.signal.disconnect();
        } else {
            this.clients.get(client)?.disconnect();
        }
    }

    public disconnectSignal() {
        this.signal.disconnect();
    }
}
