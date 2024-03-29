import { filterPatch, MapPatch, ObjectPatch, Patch } from 'megapatch';
import { partialCopy } from './partialCopy';
import { IServerEntity } from './IServerEntity';
import { IStateMessageRecipient } from './IServerToClientConnection';
import { ServerToClientMessageType } from '../shared/ServerToClientMessage';
import { IServerConfig } from './IServerConfig';
import { ClientEntity, EntityID, ClientState } from '../shared/entityTypes';

const maxUnacknowlegedDeltaFrames = 8;

export class ClientStateManager {
    constructor(
        protected readonly connection: IStateMessageRecipient,
        protected readonly serverEntities: ReadonlyMap<EntityID, IServerEntity>,
        config: IServerConfig
    ) {
        this.unacknowledgedDeltaInterval =
            config.tickInterval * 1000 * maxUnacknowlegedDeltaFrames;
        this.lastAcknowledgedTime = -this.unacknowledgedDeltaInterval;
    }

    private readonly knownEntityFields = new Map<
        EntityID,
        Set<string> | null
    >();

    private readonly unacknowledgedDeltaInterval: number;

    private lastAcknowledgedTime: number;

    private readonly unacknowledgedDeltas = new Map<number, MapPatch>();

    private determineFieldsToSend(
        entityId: number | string,
        entity?: IServerEntity
    ) {
        const fieldArray = entity?.determineFieldsToSend?.(
            this.connection.clientName
        );

        if (!fieldArray) {
            this.knownEntityFields.set(entityId as number, null);
            return null;
        }

        const fieldSet = new Set(fieldArray);

        fieldSet.add('type');

        this.knownEntityFields.set(entityId as number, fieldSet);
        return fieldSet;
    }

    private filterServerPatch(serverStatePatch: MapPatch): MapPatch {
        // Filter down to only entities the client should know,
        // and filter out any fields that they shouldn't know.
        const modifiedKnownEntities = new Set<EntityID>();

        // More specific type than just MapPatch here, cos we know some things are defined.
        const clientStatePatch: {
            s: Array<[number, any]>;
            d: Array<string | number>;
            C?: Record<number, ObjectPatch>;
        } = { s: [], d: [] };

        // Now filter each entity to the relevant fields.
        if (serverStatePatch.C) {
            clientStatePatch.C = {};
            for (const [strId, serverChildPatch] of Object.entries(
                serverStatePatch.C
            )) {
                const entityId = parseFloat(strId);
                const serverEntity = this.serverEntities.get(entityId);

                if (
                    serverEntity &&
                    serverEntity.determineVisibility?.(
                        this.connection.clientName
                    ) !== false
                ) {
                    modifiedKnownEntities.add(entityId);
                    let entityFields = this.knownEntityFields.get(entityId);

                    if (entityFields === undefined) {
                        // Newly visible entity, set it for the first time
                        entityFields = this.determineFieldsToSend(
                            entityId,
                            serverEntity
                        );

                        const clientEntity = partialCopy(
                            serverEntity,
                            entityFields
                        ) as ClientEntity;

                        clientStatePatch.s.push([entityId, clientEntity]);
                    } else {
                        // Was and still is visible
                        const childPatch = this.filterPatchEntity(
                            serverChildPatch,
                            entityFields
                        );

                        clientStatePatch.C[entityId] = childPatch;
                    }
                } else if (this.knownEntityFields.delete(entityId)) {
                    // Formerly-visible entity, now hidden.
                    clientStatePatch.d.push(entityId);
                }
            }
        }

        if (serverStatePatch.s) {
            for (let i = 0; i < serverStatePatch.s.length; i++) {
                const [entityId, serverChildPatch] = serverStatePatch.s[i];
                const serverEntity = this.serverEntities.get(
                    entityId as number
                );

                if (
                    serverEntity &&
                    serverEntity.determineVisibility?.(
                        this.connection.clientName
                    ) !== false
                ) {
                    modifiedKnownEntities.add(entityId as number);

                    const entityFields = this.determineFieldsToSend(
                        entityId,
                        serverEntity
                    );

                    const childPatch = this.filterPatchEntity(
                        serverChildPatch,
                        entityFields
                    );

                    clientStatePatch.s.push([entityId as number, childPatch]);
                }
            }
        }

        if (serverStatePatch.d && serverStatePatch.d !== true) {
            for (const entityId of serverStatePatch.d) {
                if (this.knownEntityFields.delete(entityId as number)) {
                    clientStatePatch.d.push(entityId);
                }
            }
        }

        // Check for any existing entity's visibility changing,
        // despite the entity itself not having updated.
        // (e.g. due to the client's character moving around.)
        for (const [entityId, serverEntity] of this.serverEntities) {
            if (this.knownEntityFields.has(entityId)) {
                if (
                    !modifiedKnownEntities.has(entityId) &&
                    serverEntity.determineVisibility?.(
                        this.connection.clientName
                    ) === false
                ) {
                    // A known entity that is no longer visible.
                    clientStatePatch.d.push(entityId);
                }
            } else if (
                serverEntity.determineVisibility?.(
                    this.connection.clientName
                ) !== false
            ) {
                // An unknown entity that is now visible.
                const entityFields = this.determineFieldsToSend(
                    entityId,
                    serverEntity
                );

                const clientEntity = partialCopy(
                    serverEntity,
                    entityFields
                ) as ClientEntity;

                clientStatePatch.s.push([entityId, clientEntity]);
            }
        }

        if (clientStatePatch.s.length === 0) {
            delete (clientStatePatch as MapPatch).s;
        }

        if (clientStatePatch.d.length === 0) {
            delete (clientStatePatch as MapPatch).d;
        }

        return clientStatePatch;
    }

    private filterPatchEntity(
        serverChildPatch: Patch,
        entityFields: Set<string> | null
    ) {
        return entityFields === null
            ? (serverChildPatch as ObjectPatch)
            : filterPatch(serverChildPatch as ObjectPatch, entityFields);
    }

    private filterServerState(
        serverEntities: ReadonlyMap<EntityID, IServerEntity>
    ) {
        this.knownEntityFields.clear();

        const clientEntities = new Map<EntityID, ClientEntity>();

        for (const [entityId, serverEntity] of serverEntities) {
            if (
                serverEntity.determineVisibility?.(
                    this.connection.clientName
                ) !== false
            ) {
                const entityFields = this.determineFieldsToSend(
                    entityId,
                    serverEntity
                );

                const clientEntity = partialCopy(
                    serverEntity,
                    entityFields
                ) as ClientEntity;

                clientEntities.set(entityId, clientEntity);
            }
        }

        return clientEntities;
    }

    public forceFullUpdate() {
        this.forceSendFullState = true;
    }

    public forgetEntity(entityID: EntityID) {
        this.knownEntityFields.delete(entityID);
    }

    private forceSendFullState = true;

    protected shouldSendFullState(time: number) {
        return (
            this.forceSendFullState ||
            this.lastAcknowledgedTime <= time - this.unacknowledgedDeltaInterval
        );
    }

    public update(tickId: number, serverStatePatch: MapPatch | null) {
        if (this.shouldSendFullState(tickId)) {
            this.forceSendFullState = false;
            const fullState = this.filterServerState(this.serverEntities);

            this.sendFullState(fullState, tickId);
        } else {
            const patchChange =
                serverStatePatch === null
                    ? null
                    : this.filterServerPatch(serverStatePatch);

            this.sendDeltaState(patchChange, tickId);
        }
    }

    protected sendFullState(state: ClientState, time: number) {
        // Disregard any delta history, cos we'll keep sending full states til they acknowledge something.
        this.unacknowledgedDeltas.clear();

        this.connection.send([
            ServerToClientMessageType.FullState,
            state,
            time,
        ]);
    }

    protected sendDeltaState(update: MapPatch | null, time: number) {
        if (update !== null) {
            this.unacknowledgedDeltas.set(time, update);
        }

        const cumulativeDelta = this.combineUnacknowledgedDeltas(); // TODO: could we cache this?

        this.connection.send([
            ServerToClientMessageType.DeltaState,
            cumulativeDelta,
            time,
        ]);
    }

    public receiveAcknowledge(time: number) {
        this.lastAcknowledgedTime = time;

        for (const testTime of this.unacknowledgedDeltas.keys()) {
            if ((testTime as unknown as number) <= time) {
                this.unacknowledgedDeltas.delete(testTime);
            }
        }
    }

    private combineUnacknowledgedDeltas() {
        let cumulativeDelta: MapPatch[] = [];

        for (const [, delta] of this.unacknowledgedDeltas) {
            cumulativeDelta = [...cumulativeDelta, delta];
        }

        return cumulativeDelta;
    }
}
