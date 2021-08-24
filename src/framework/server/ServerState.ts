import { ClientID } from './IServer';
import { IServerEntity } from './IServerEntity';
import { ClientStateManager } from './ClientStateManager';
import { EntityID } from '../shared/entityTypes';
import { IServerState } from './IServerState';

export class ServerState<TClientCommand, TServerEvent> implements IServerState {
    private readonly entitiesById = new Map<EntityID, IServerEntity>();
    private readonly idsByEntity = new Map<IServerEntity, EntityID>();

    private readonly deletedEntities = new Set<EntityID>();
    private readonly recalculateEntities = new Set<EntityID>();
    private readonly recalculateClients = new Set<ClientID>();

    private readonly clientStates = new Map<
        ClientID,
        ClientStateManager<TClientCommand, TServerEvent>
    >();

    private nextID: EntityID = 1;

    private readonly freedIDs: EntityID[] = [];

    public update(dt: number) {
        for (const entity of this.entitiesById.values()) {
            entity.update?.(dt);
        }

        for (const clientId of this.recalculateClients) {
            this.clientStates.get(clientId)?.deleteAllEntities();
        }

        for (const clientState of this.clientStates.values()) {
            for (const id of this.deletedEntities) {
                clientState.deleteEntity(id);
            }
            for (const id of this.recalculateEntities) {
                clientState.deleteEntity(id);
            }

            clientState.update();
        }

        this.freedIDs.splice(this.freedIDs.length, 0, ...this.deletedEntities);

        this.deletedEntities.clear();
        this.recalculateClients.clear();
        this.recalculateEntities.clear();
    }

    public get entities(): ReadonlyMap<EntityID, IServerEntity> {
        return this.entitiesById;
    }

    public get clients(): ReadonlyMap<
        ClientID,
        ClientStateManager<TClientCommand, TServerEvent>
    > {
        return this.clientStates;
    }

    public getEntity(id: EntityID) {
        return this.entitiesById.get(id);
    }

    public getEntityID(entity: IServerEntity) {
        return this.idsByEntity.get(entity);
    }

    public addEntity(entity: IServerEntity) {
        const id = this.freedIDs.pop() ?? this.nextID++;

        const proxy = this.createEntityProxy(id, entity);

        this.entitiesById.set(id, proxy);

        //this.idsByEntity.set(entity, id);
        this.idsByEntity.set(proxy, id);

        return id;
    }

    public deleteEntity(id: EntityID) {
        const entity = this.entitiesById.get(id);
        if (entity === undefined) {
            return;
        }

        this.entitiesById.delete(id);
        this.idsByEntity.delete(entity);

        this.deletedEntities.add(id);
    }

    // Indicate that the fields to send to clients have fundamentally changed (e.g. the entity changed team)...
    // Client states should delete it, and will recreate it if it's still visible.
    public recalculateEntity(entityId: EntityID) {
        const entity = this.entitiesById.get(entityId);
        if (entity === undefined) {
            return;
        }

        this.recalculateEntities.add(entityId);
    }

    // Indicate that the fields to send to this specific client (for EVERY entity) have fundamentally changed...
    // The client's state should forget everything it knows already.
    public recalculateClient(clientId: ClientID) {
        this.recalculateClients.add(clientId);
    }

    public addClient(
        clientId: ClientID,
        manager: ClientStateManager<TClientCommand, TServerEvent>
    ) {
        if (this.clientStates.has(clientId)) {
            return;
        }

        this.clientStates.set(clientId, manager);
    }

    public getClient(clientId: ClientID) {
        return this.clientStates.get(clientId);
    }

    public deleteClient(clientId: ClientID) {
        return this.clientStates.delete(clientId);
    }

    private createEntityProxy(
        entityId: EntityID,
        entity: IServerEntity
    ): IServerEntity {
        // TODO: this needs updated to handle nested properties, e.g. if we have a property of pos,
        // then setting pos.x should still update the client states.
        return new Proxy(entity, {
            set: (
                target: IServerEntity,
                property: PropertyKey,
                value: any,
                receiver: any
            ) => {
                Reflect.set(target, property, value, receiver);

                for (const clientState of this.clientStates.values()) {
                    clientState.trySetEntityValue(entityId, property, value);
                }

                return true;
            },
            deleteProperty: (target: IServerEntity, property: PropertyKey) => {
                Reflect.deleteProperty(target, property);

                for (const clientState of this.clientStates.values()) {
                    clientState.trySetEntityValue(
                        entityId,
                        property,
                        undefined
                    );
                }

                return true;
            },
        });
    }
}
