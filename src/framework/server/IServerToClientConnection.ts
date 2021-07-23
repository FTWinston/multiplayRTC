import { ClientToServerMessage } from '../shared/ClientToServerMessage';
import { ServerToClientMessage } from '../shared/ServerToClientMessage';

export interface IServerToClientConnection<TClientCommand, TServerEvent> {
    readonly clientName: string;

    send(message: ServerToClientMessage<TServerEvent>): void;

    connect(
        receive: (message: ClientToServerMessage<TClientCommand>) => void
    ): void;

    disconnect(): void;
}

export interface IServerToClientConnectionProvider<
    TClientCommand,
    TServerEvent
> {
    connect(args: {
        serverDisconnected: () => void;
        clientConnected: (
            connection: IServerToClientConnection<TClientCommand, TServerEvent>
        ) => boolean;
        clientDisconnected: (
            connection: IServerToClientConnection<TClientCommand, TServerEvent>
        ) => void;
    }): Promise<string>;

    disconnect(): void;
}
