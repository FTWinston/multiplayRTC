import { ServerWorkerMessageInType } from '../ServerWorkerMessageIn';
import {
    eventMessageIdentifier,
    deltaStateMessageIdentifier,
    fullStateMessageIdentifier,
    errorMessageIdentifier,
    controlMessageIdentifier,
    ControlOperation,
    ServerToClientMessage,
    CommonEvent,
    IEvent,
} from '../shared/ServerToClientMessage';
import {
    OfflineServerConnection,
    OfflineConnectionParameters,
} from './OfflineServerConnection';
import { ConnectionManager } from '../ConnectionManager';
import { IServerToClientConnection } from '../server/IServerToClientConnection';
import { IConnectionSettings } from '../shared/SignalConnection';
import { Patch } from 'megapatch/lib/Patch';

export interface LocalConnectionParameters<
    TServerEvent,
    TClientState extends {},
    TLocalState extends {}
> extends OfflineConnectionParameters<TServerEvent, TClientState, TLocalState> {
    signalSettings: IConnectionSettings;
    clientName: string;
    ready: () => void;
}

export class LocalServerConnection<
        TClientCommand,
        TServerEvent,
        TClientState,
        TLocalState extends {} = {}
    >
    extends OfflineServerConnection<
        TClientCommand,
        TServerEvent,
        TClientState,
        TLocalState
    >
    implements IServerToClientConnection<TClientCommand, TServerEvent>
{
    private clients: ConnectionManager<
        TClientCommand,
        TServerEvent,
        TClientState
    >;
    readonly clientName: string;

    constructor(
        params: LocalConnectionParameters<
            TServerEvent,
            TClientState,
            TLocalState
        >
    ) {
        super(params, () => {
            if (params.clientName.length < 1) {
                console.log('Local player has no name, aborting');
                params.worker.terminate();
                return;
            }

            this.clients = new ConnectionManager(
                (message) => this.sendMessageToServer(message),
                (sessionId) => {
                    console.log(`Session ID is ${sessionId}`);
                    this._sessionId = sessionId;

                    this.sendMessageToServer({
                        type: ServerWorkerMessageInType.Join,
                        who: params.clientName,
                    });

                    params.ready();
                },
                params.signalSettings,
                this
            );
        });

        this.clientName = params.clientName;
    }

    protected onServerReady() {
        // Don't send a join message right away. This will instead be sent once the peer is initialized.
    }

    send(message: ServerToClientMessage<TServerEvent>): void {
        // TODO: can we avoid having this AND separate dispatch operations?

        if (message[0] === fullStateMessageIdentifier) {
            super.dispatchFullState(this.clientName, message[1], message[2]);
        } else if (message[0] === deltaStateMessageIdentifier) {
            super.dispatchDeltaState(this.clientName, message[1], message[2]);
        } else if (message[0] === eventMessageIdentifier) {
            super.dispatchEvent(this.clientName, message[1]);
        } else if (message[0] === errorMessageIdentifier) {
            super.dispatchError(this.clientName, message[1]);
        } else if (message[0] === controlMessageIdentifier) {
            // control operation ... doesn't apply to local client?
        }
    }

    protected dispatchEvent(
        client: string | undefined,
        event: TServerEvent | CommonEvent
    ) {
        this.clients.sendToClient(client, [eventMessageIdentifier, event]);
    }

    protected dispatchFullState(client: string, state: string, time: number) {
        this.clients.sendToClient(client, [
            fullStateMessageIdentifier,
            state,
            time,
        ]);
    }

    protected dispatchDeltaState(client: string, state: Patch[], time: number) {
        this.clients.sendToClient(client, [
            deltaStateMessageIdentifier,
            state,
            time,
        ]);
    }

    protected dispatchError(client: string | undefined, message: string) {
        this.clients.sendToClient(client, [errorMessageIdentifier, message]);
        this.clients.disconnect(client);
    }

    protected dispatchControl(
        client: string | undefined,
        operation: ControlOperation
    ) {
        this.clients.sendToClient(client, [
            controlMessageIdentifier,
            operation,
        ]);
    }

    disconnect() {
        // TODO: possible infinite loop here
        super.disconnect();
        this.clients.disconnect(undefined);
    }

    get localId() {
        return this.clientName;
    }

    get sessionId() {
        return this._sessionId;
    }

    private _sessionId: string = '';
}
