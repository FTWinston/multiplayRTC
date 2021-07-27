import { IServer } from './Server';

type ClientID = string;

export interface IEntity {
    readonly type: string;
}

export interface IServerEntity extends IEntity {
    determineVisibility?(client: ClientID): boolean;
    determineFieldsToSend?(client: ClientID): string[] | null;
    update?(dt: number): void;
}

export interface IServerRulesEntity<TClientInfo, TClientCommand, TServerEvent>
    extends IServerEntity {
    readonly type: 'rules';

    serverStarted?(server: IServer<TClientInfo, TServerEvent>): void;

    serverStopped?(server: IServer<TClientInfo, TServerEvent>): void;

    clientJoined(client: ClientID): TClientInfo;

    clientDisconnected?(client: ClientID): void;

    commandReceived?(client: ClientID, command: TClientCommand): void;
}

/*
export class ReferenceTo {
    constructor(readonly id: EntityID) {}

    resolve(state: ServerState) {
        return state.get(this.id);
    }

    toJSON() {
        return this.id;
    }
}
*/
