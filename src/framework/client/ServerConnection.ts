import { IEvent, SystemEvent } from './ServerToClientMessage';
import { applyChanges } from 'megapatch/lib/applyChanges';
import { Patch } from 'megapatch/lib/Patch';

export interface ConnectionMetadata {
    name: string;
}

export interface ConnectionParameters<
    TServerEvent,
    TClientState extends {},
    TLocalState extends {} = {}
> {
    initialClientState: TClientState;
    initialLocalState?: TLocalState;
    receiveEvent: (cmd: TServerEvent) => void;
    clientStateChanged?: (
        prevState: Readonly<TClientState>,
        newState: Readonly<TClientState>
    ) => void;
    receiveError: (message: string) => void;
}

export abstract class ServerConnection<
    TClientCommand,
    TServerEvent,
    TClientState extends {},
    TLocalState extends {} = {}
> {
    constructor(
        params: ConnectionParameters<TServerEvent, TClientState, TLocalState>
    ) {
        this.receiveEvent = params.receiveEvent;
        this.receiveError = params.receiveError;
        this.clientStateChanged = params.clientStateChanged;
        this._clientState = params.initialClientState;
    }

    protected readonly receiveEvent: (
        event: TServerEvent | SystemEvent
    ) => void;
    protected readonly receiveError: (message: string) => void;
    private readonly clientStateChanged?: (
        prevState: TClientState,
        newState: TClientState
    ) => void;
    private _clientState: TClientState;

    get clientState(): Readonly<TClientState> {
        return this._clientState;
    }

    public localState: TLocalState;

    protected receiveFullState(newState: TClientState) {
        const prevState = this._clientState;
        this._clientState = newState;
        if (prevState !== newState && this.clientStateChanged) {
            this.clientStateChanged(prevState, newState);
        }
    }

    protected receiveDeltaState(delta: Patch) {
        if (!delta) {
            return;
        }

        const prevState = this._clientState;
        const newState = applyChanges(prevState, delta);

        if (newState !== prevState && this.clientStateChanged) {
            this._clientState = newState;
            this.clientStateChanged(prevState, newState);
        }
    }

    abstract sendCommand(command: TClientCommand): void;

    abstract disconnect(): void;

    abstract get localId(): string;

    abstract get sessionId(): string;
}
