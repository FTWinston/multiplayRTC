import { ClientToServerMessage } from '../shared/ClientToServerMessage';
import {
    ServerToClientMessage,
    ServerToClientMessageType,
} from '../shared/ServerToClientMessage';
import {
    IServerToClientConnection,
    IServerToClientConnectionProvider,
} from './IServerToClientConnection';

const worker: Worker = self as any;

export class LocalClientConnection<TClientCommand, TServerEvent>
    implements IServerToClientConnection<TClientCommand, TServerEvent>
{
    constructor(public readonly clientName: string) {}

    public send(message: ServerToClientMessage<TServerEvent>) {
        if (message[0] === ServerToClientMessageType.Control) {
            return;
        }

        worker.postMessage(message);
    }

    public connect(
        receive: (message: ClientToServerMessage<TClientCommand>) => void
    ) {
        worker.onmessage = (e) => receive(e.data);
    }

    public disconnect() {
        worker.terminate();
    }
}

export class LocalClientConnectionProvider<TClientCommand, TServerEvent>
    implements IServerToClientConnectionProvider<TClientCommand, TServerEvent>
{
    constructor(readonly clientName: string = 'local') {}

    public async connect(args: {
        serverDisconnected: () => void;
        clientConnected: (
            connection: IServerToClientConnection<TClientCommand, TServerEvent>
        ) => boolean;
        clientDisconnected: (
            connection: IServerToClientConnection<TClientCommand, TServerEvent>
        ) => void;
    }) {
        args.clientConnected(new LocalClientConnection(this.clientName));
        return 'local';
    }

    public disconnect() {
        worker.terminate();
    }
}
