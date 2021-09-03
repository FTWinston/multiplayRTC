import { ClientID } from './IServer';
import { IServerEntity } from './IServerEntity';
import { EntityID } from '../shared/entityTypes';
import { IStateMessageRecipient } from './IServerToClientConnection';
import { IServerConfig } from './IServerConfig';

export interface IServerState {
    readonly entities: ReadonlyMap<EntityID, IServerEntity>;

    addEntity(entity: IServerEntity): EntityID;

    getEntity(id: EntityID): IServerEntity | undefined;

    deleteEntity(id: EntityID): void;

    update(tickDuration: number, tickId: number): void;

    recalculateEntity(entityId: EntityID): void;

    recalculateClient(clientId: ClientID): void;

    addClient(
        connection: IStateMessageRecipient,
        serverConfig: IServerConfig
    ): void;

    deleteClient(clientId: ClientID): void;

    receiveAcknowledge(clientId: ClientID, tickId: number): void;
}
