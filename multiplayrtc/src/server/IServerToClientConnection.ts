import { ClientToServerMessage } from '../shared/ClientToServerMessage';
import {
    ServerToClientMessage,
    ServerToClientStateMessage,
} from '../shared/ServerToClientMessage';

export interface IStateMessageRecipient {
    readonly clientName: string;

    send(message: ServerToClientStateMessage): void;
}

export interface IServerToClientConnection<TClientCommand, TServerEvent>
    extends IStateMessageRecipient {
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
