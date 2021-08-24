import { ClientID } from './IServer';
import { IServerEntity } from './IServerEntity';
import { EntityID } from '../shared/entityTypes';

export interface IServerState {
    readonly entities: ReadonlyMap<EntityID, IServerEntity>;

    addEntity(entity: IServerEntity): EntityID;

    deleteEntity(id: EntityID): void;

    recalculateEntity(entityId: EntityID): void;

    recalculateClient(clientId: ClientID): void;
}
