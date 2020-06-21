import { PatchOperation } from 'filter-mirror';
import { applyPatch } from './applyPatch';
import { IEvent, SystemEvent } from './ServerToClientMessage';

export interface ConnectionMetadata {
    name: string;
}

export interface ConnectionParameters<
    TEvent extends IEvent,
    TClientState extends {},
    TLocalState extends {} = {}
> {
    initialClientState: TClientState;
    initialLocalState?: TLocalState;
    receiveCommand: (cmd: TEvent) => void;
    clientStateChanged?: (
        prevState: Readonly<TClientState>,
        newState: Readonly<TClientState>
    ) => void;
    receiveError: (message: string) => void;
}

export abstract class ServerConnection<
    TClientToServerCommand,
    TEvent extends IEvent,
    TClientState extends {},
    TLocalState extends {} = {}
> {
    constructor(
        params: ConnectionParameters<
            TEvent,
            TClientState,
            TLocalState
        >
    ) {
        this.receiveEvent = params.receiveCommand;
        this.receiveError = params.receiveError;
        this.clientStateChanged = params.clientStateChanged;
        this._clientState = params.initialClientState;
    }

    protected readonly receiveEvent: (event: TEvent | SystemEvent) => void;
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

    protected receiveDeltaState(delta: PatchOperation[]) {
        if (!delta) {
            return;
        }

        const prevState = this._clientState;
        const newState = applyPatch(prevState, delta);

        if (newState !== prevState && this.clientStateChanged) {
            this._clientState = newState;
            this.clientStateChanged(prevState, newState);
        }
    }

    abstract sendCommand(command: TClientToServerCommand): void;

    abstract disconnect(): void;

    abstract get localId(): string;

    abstract get sessionId(): string;
}
