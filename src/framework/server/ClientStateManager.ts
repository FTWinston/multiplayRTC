import { recordChanges } from 'megapatch/lib/recordChanges';
import { finishRecordingRaw } from 'megapatch/lib/finishRecording';
import { partialCopy } from './partialCopy';
import { IServerEntity } from './IServerEntity';
import { IStateMessageRecipient } from './IServerToClientConnection';
import { ServerToClientMessageType } from '../shared/ServerToClientMessage';
import { Patch } from 'megapatch/lib/Patch';
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

        this.allocateProxy();
        this.update();
    }

    private readonly unacknowledgedDeltaInterval: number;

    private lastAcknowledgedTime: number;

    private readonly unacknowledgedDeltas = new Map<number, Patch[]>();

    private allocateProxy() {
        this.proxiedEntitiesById = recordChanges(this.entitiesById);
    }

    public update() {
        for (const [entityId, entity] of this.serverEntities) {
            if (
                entity.determineVisibility?.(this.connection.clientName) ===
                false
            ) {
                this.deleteEntity(entityId);
                continue;
            }

            if (!this.entitiesById.has(entityId)) {
                // If determineFieldsToSet isn't defined, or returns null, always send all fields.
                const fieldsArray =
                    entity.determineFieldsToSend?.(
                        this.connection.clientName
                    ) ?? null;

                const fieldsSet =
                    fieldsArray === null ? null : new Set(...fieldsArray);

                if (fieldsSet) {
                    fieldsSet.add('type');
                    this.fieldsById.set(entityId, fieldsSet);
                }

                const entityCopy = partialCopy(entity, fieldsSet);
                this.proxiedEntitiesById.set(
                    entityId,
                    entityCopy as ClientEntity
                );
            }
        }
    }

    public trySetEntityValue(
        entityId: EntityID,
        property: PropertyKey,
        value: any
    ) {
        const entity = this.proxiedEntitiesById.get(entityId);

        if (!entity) {
            return;
        }

        // If a limited set of fields was specified, only continue if this is one of them.
        const fields = this.fieldsById.get(entityId);
        if (fields && !fields.has(property)) {
            return;
        }

        if (value === undefined) {
            Reflect.deleteProperty(entity, property);
        } else {
            Reflect.set(entity, property, value);
        }
    }

    public deleteEntity(entityID: EntityID) {
        this.fieldsById.delete(entityID);
        this.entitiesById.delete(entityID);
        this.proxiedEntitiesById.delete(entityID);
    }

    public deleteAllEntities() {
        this.fieldsById.clear();
        this.entitiesById.clear();
        this.proxiedEntitiesById.clear();
    }

    protected readonly entitiesById = new Map<EntityID, ClientEntity>();
    private proxiedEntitiesById: Map<EntityID, ClientEntity>;
    private readonly fieldsById = new Map<EntityID, Set<PropertyKey>>();

    public get entities(): ReadonlyMap<EntityID, ClientEntity> {
        return this.entitiesById;
    }

    private getChanges() {
        const patch = finishRecordingRaw(this.proxiedEntitiesById);

        this.allocateProxy();

        return patch;
    }

    private forceSendFullState = true;

    protected shouldSendFullState(time: number) {
        return (
            this.forceSendFullState ||
            this.lastAcknowledgedTime <= time - this.unacknowledgedDeltaInterval
        );
    }

    public sendState(time: number) {
        if (this.shouldSendFullState(time)) {
            this.sendFullState(this.entitiesById, time);
            this.forceSendFullState = false;
        } else {
            this.sendDeltaState([this.getChanges() ?? {}], time);
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

    protected sendDeltaState(updates: Patch[], time: number) {
        this.unacknowledgedDeltas.set(time, updates);

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
        let cumulativeDelta: Patch[] = [];

        for (const [, delta] of this.unacknowledgedDeltas) {
            cumulativeDelta = [...cumulativeDelta, ...delta];
        }

        return cumulativeDelta;
    }
}
