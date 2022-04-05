import { finishRecordingRaw, recordChanges } from 'megapatch';
import { ClientID } from './IServer';
import { IServerEntity } from './IServerEntity';
import { ClientStateManager } from './ClientStateManager';
import { EntityID } from '../shared/entityTypes';
import { IServerState } from './IServerState';
import { IStateMessageRecipient } from './IServerToClientConnection';
import { IServerConfig } from './IServerConfig';

export class ServerState implements IServerState {
    private readonly entitiesById = new Map<EntityID, IServerEntity>();
    private proxiedEntitiesById: Map<EntityID, IServerEntity>;

    private readonly deletedEntities = new Set<EntityID>();
    private readonly recalculateEntities = new Set<EntityID>();
    private readonly recalculateClients = new Set<ClientID>();

    private readonly clientStates = new Map<ClientID, ClientStateManager>();

    private nextID: EntityID = 1;

    private readonly freedIDs: EntityID[] = [];

    constructor() {
        this.allocateProxy();
    }

    private allocateProxy() {
        this.proxiedEntitiesById = recordChanges(this.entitiesById);
    }

    public update(dt: number, tickId: number) {
        for (const entity of this.entitiesById.values()) {
            entity.update?.(dt);
        }

        const serverStatePatch = finishRecordingRaw(this.proxiedEntitiesById);

        this.allocateProxy();

        for (const clientId of this.recalculateClients) {
            this.clientStates.get(clientId)?.forceFullUpdate();
        }

        for (const clientState of this.clientStates.values()) {
            for (const id of this.recalculateEntities) {
                clientState.forgetEntity(id);
            }

            clientState.update(tickId, serverStatePatch);
        }

        this.freedIDs.splice(this.freedIDs.length, 0, ...this.deletedEntities);

        this.deletedEntities.clear();
        this.recalculateClients.clear();
        this.recalculateEntities.clear();
    }

    public get entities(): ReadonlyMap<EntityID, IServerEntity> {
        return this.proxiedEntitiesById;
    }

    public get clients(): ReadonlyMap<ClientID, ClientStateManager> {
        return this.clientStates;
    }

    public getEntity(id: EntityID) {
        return this.proxiedEntitiesById.get(id);
    }

    public addEntity(entity: IServerEntity) {
        const id = this.freedIDs.pop() ?? this.nextID++;

        this.proxiedEntitiesById.set(id, entity);

        return id;
    }

    public deleteEntity(id: EntityID) {
        if (this.proxiedEntitiesById.delete(id)) {
            this.deletedEntities.add(id);
        }
    }

    // Indicate that the fields to send to clients have fundamentally changed (e.g. the entity changed team)...
    // Client states should delete it, and will recreate it if it's still visible.
    public recalculateEntity(entityId: EntityID) {
        if (this.entitiesById.has(entityId)) {
            this.recalculateEntities.add(entityId);
        }
    }

    // Indicate that the fields to send to this specific client (for EVERY entity) have fundamentally changed...
    // The client's state should forget everything it knows already.
    public recalculateClient(clientId: ClientID) {
        this.recalculateClients.add(clientId);
    }

    public addClient(
        connection: IStateMessageRecipient,
        serverConfig: IServerConfig
    ) {
        if (this.clientStates.has(connection.clientName)) {
            return;
        }

        const clientManager = new ClientStateManager(
            connection,
            this.entitiesById,
            serverConfig
        );

        this.clientStates.set(connection.clientName, clientManager);
    }

    public getClient(clientId: ClientID) {
        return this.clientStates.get(clientId);
    }

    public deleteClient(clientId: ClientID) {
        return this.clientStates.delete(clientId);
    }

    public receiveAcknowledge(clientId: ClientID, tickId: number) {
        this.clients.get(clientId)?.receiveAcknowledge(tickId);
    }
}
