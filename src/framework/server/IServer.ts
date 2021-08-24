import { IServerState } from './ServerState';

export type ClientID = string;

export interface IServer<TClientInfo, TServerEvent> {
    readonly clients: ReadonlyMap<ClientID, TClientInfo>;

    readonly state: IServerState;

    sendEvent(client: ClientID | null, event: TServerEvent): void;

    pause(): void;

    resume(): void;

    stop(message?: string): void;
}
