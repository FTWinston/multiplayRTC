import { applyChanges } from 'megapatch/lib/applyChanges';
import { Patch } from 'megapatch/lib/Patch';
import type { ClientEntity, ClientState } from '../server/ClientStateManager';
import type { EntityID } from '../server/ServerState';
import {
    CommonEvent,
    ServerToClientMessage,
    ServerToClientMessageType,
} from '../shared/ServerToClientMessage';

export interface ConnectionParameters<TServerEvent> {
    receiveEvent: (cmd: TServerEvent) => void;
    clientStateChanged?: (
        prevState: Readonly<ClientState>,
        newState: Readonly<ClientState>
    ) => void;
    receiveError: (message: string) => void;
}

export abstract class ServerConnection<TClientCommand, TServerEvent> {
    constructor(params: ConnectionParameters<TServerEvent>) {
        this.receiveEvent = params.receiveEvent;
        this.receiveError = params.receiveError;
        this.clientStateChanged = params.clientStateChanged;
    }

    protected receiveMessageFromServer(
        message: ServerToClientMessage<TServerEvent>
    ) {
        switch (message[0]) {
            case ServerToClientMessageType.Event:
                this.receiveEvent(message[1]);
                break;
            case ServerToClientMessageType.FullState:
                this.receiveFullState(message[1], message[2]);
                break;
            case ServerToClientMessageType.DeltaState:
                this.receiveDeltaState(message[1], message[2]);
                break;
            case ServerToClientMessageType.CommonEvent:
                this.receiveCommonEvent(message[1]);
                break;
            /*
            case ServerToClientMessageType.Ready:
                if (this.ready) {
                    this.onServerReady();
                    this.ready();
                    delete this.ready;
                }
                break;
            */
            case ServerToClientMessageType.Error:
                this.receiveError(message[1]);
                this.disconnect();
                break;
            default:
                console.log(
                    'received unrecognised message from server',
                    message
                );
                break;
        }
    }

    protected readonly receiveEvent: (event: TServerEvent) => void;

    protected readonly receiveCommonEvent: (event: CommonEvent) => void;

    protected readonly receiveError: (message: string) => void;

    private readonly clientStateChanged?: (
        prevState: ClientState,
        newState: ClientState
    ) => void;
    private _clientState = new Map<EntityID, ClientEntity>();

    get clientState(): Readonly<ClientState> {
        return this._clientState;
    }

    protected receiveFullState(newState: ClientState, time: number) {
        this.sendAcknowledge(time);

        const prevState = this._clientState;
        this._clientState = newState;
        if (prevState !== newState && this.clientStateChanged) {
            this.clientStateChanged(prevState, newState);
        }
    }

    protected receiveDeltaState(deltas: Patch[], time: number) {
        this.sendAcknowledge(time);

        if (!deltas || deltas.length === 0) {
            return;
        }

        const prevState = this._clientState;
        let newState = prevState;

        for (const delta of deltas) {
            newState = applyChanges(newState, delta);
        }

        if (newState !== prevState && this.clientStateChanged) {
            this._clientState = newState;
            this.clientStateChanged(prevState, newState);
        }
    }

    public abstract sendCommand(command: TClientCommand): void;

    protected abstract sendAcknowledge(time: number): void;

    protected abstract sendQuit(): void;

    public abstract disconnect(): void;

    public abstract get localId(): string;

    public abstract get sessionId(): string;
}
