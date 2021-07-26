import {
    CommonEvent,
    ServerToClientMessage,
    ServerToClientMessageType,
} from '../shared/ServerToClientMessage';
import { ClientID, IServerState, ServerState } from './ServerState';
import {
    IServerToClientConnection,
    IServerToClientConnectionProvider,
} from './IServerToClientConnection';
import { IServerRulesEntity } from './IServerEntity';
import {
    ClientToServerMessage,
    ClientToServerMessageType,
} from '../shared/ClientToServerMessage';
import { ClientStateManager } from './ClientStateManager';
import { IServerConfig } from './IServerConfig';

export interface IServer<TClientCommand, TServerEvent> {
    readonly clients: ReadonlyMap<
        ClientID,
        IServerToClientConnection<TClientCommand, TServerEvent>
    >;

    readonly state: IServerState;

    sendEvent(client: ClientID | null, event: TServerEvent): void;

    pause(): void;

    resume(): void;

    stop(message?: string): void;
}

export class Server<TClientCommand, TServerEvent>
    implements IServer<TClientCommand, TServerEvent>
{
    constructor(
        rules: IServerRulesEntity<TClientCommand, TServerEvent>,
        public readonly config: IServerConfig,
        ...connectionProviders: IServerToClientConnectionProvider<
            TClientCommand,
            TServerEvent
        >[]
    ) {
        const rulesID = this.state.addEntity(rules);
        this.rules = this.state.getEntity(rulesID) as IServerRulesEntity<
            TClientCommand,
            TServerEvent
        >;

        this.connectionProviders = connectionProviders;

        this.resume();
    }

    private tickTimer: NodeJS.Timeout | undefined;
    private lastTickTime: number;

    protected readonly rules: IServerRulesEntity<TClientCommand, TServerEvent>;

    private readonly connectionProviders: IServerToClientConnectionProvider<
        TClientCommand,
        TServerEvent
    >[];

    public readonly state = new ServerState<TClientCommand, TServerEvent>();

    private readonly _clients = new Map<
        ClientID,
        IServerToClientConnection<TClientCommand, TServerEvent>
    >();

    public get clients(): ReadonlyMap<
        ClientID,
        IServerToClientConnection<TClientCommand, TServerEvent>
    > {
        return this._clients;
    }

    public async initialise() {
        this.rules.serverStarted?.(this);

        for (const provider of this.connectionProviders) {
            const sessionId = await provider.connect({
                serverDisconnected: () => {
                    // TODO: do something ... if game still in progress, presumably try to reconnect?
                },
                clientConnected: (clientConnection) =>
                    this.addClientConnection(clientConnection),
                clientDisconnected: (clientConnection) =>
                    this.clientDisconnected(clientConnection.clientName),
            });

            // TODO: do something with the sessionId ... I guess save it, and have it sent to every client?
            // Argh, we only care about a session ID from the remote connection provider.
        }
    }

    private sendMessage(
        client: ClientID | null,
        message: ServerToClientMessage<TServerEvent>
    ) {
        if (client === null) {
            for (const client of this._clients.values()) {
                client.send(message);
            }
        } else {
            this._clients.get(client)?.send(message);
        }
    }

    protected sendError(client: ClientID | null, message: string) {
        this.sendMessage(client, [ServerToClientMessageType.Error, message]);
    }

    protected sendCommonEvent(client: ClientID | null, event: CommonEvent) {
        this.sendMessage(client, [
            ServerToClientMessageType.CommonEvent,
            event,
        ]);
    }

    public sendEvent(client: ClientID | null, event: TServerEvent) {
        this.sendMessage(client, [ServerToClientMessageType.Event, event]);
    }

    protected addClientConnection(
        connection: IServerToClientConnection<TClientCommand, TServerEvent>
    ) {
        const joinError = this.getJoinError(connection.clientName);

        if (joinError !== null) {
            this.sendError(connection.clientName, joinError);
            return false;
        }

        connection.connect((clientToServerMessage) => {
            if (
                !this.receiveMessage(
                    connection.clientName,
                    clientToServerMessage
                )
            ) {
                console.log(
                    `received unrecognised message from ${connection.clientName}`,
                    clientToServerMessage
                );
            }
        });

        if (process.env.NODE_ENV === 'development') {
            console.log(`${connection.clientName} joined`);
        }

        this._clients.set(connection.clientName, connection);

        this.state.addClient(
            connection.clientName,
            new ClientStateManager(connection, this.state)
        );

        this.rules.clientJoined?.(connection.clientName);

        this.sendCommonEvent(null, {
            type: 'join',
            client: connection.clientName,
        });

        return true;
    }

    private clientDisconnected(client: ClientID) {
        this.state.deleteClient(client);
        if (!this._clients.delete(client)) {
            return;
        }

        this.rules.clientDisconnected?.(client);

        this.sendCommonEvent(null, {
            type: 'quit',
            client,
        });
    }

    protected receiveMessage(
        client: ClientID,
        message: ClientToServerMessage<TClientCommand>
    ) {
        switch (message[0]) {
            case ClientToServerMessageType.Acknowledge: {
                const time = message[1];
                this.state.clients.get(client)?.receiveAcknowledge(time);
                return true;
            }

            case ClientToServerMessageType.Command: {
                const command = message[1];
                if (process.env.NODE_ENV === 'development') {
                    console.log(`${client} issued a command`, command);
                }

                this.rules.commandReceived?.(client, command);
                return true;
            }

            case ClientToServerMessageType.Quit: {
                if (process.env.NODE_ENV === 'development') {
                    console.log(`${client} quit`);
                }

                this.clientDisconnected(client);
                return true;
            }

            default:
                return false;
        }
    }

    protected isClientNameInUse(name: string) {
        return this.clients.has(name);
    }

    protected getJoinError(clientName: string): string | null {
        if (clientName.length > 50) {
            return 'Your name is too long';
        }

        if (this.isClientNameInUse(clientName)) {
            return 'Your name is already in use';
        }

        return null;
    }

    // TODO: status? e.g. not started, active, paused, finished
    public get isRunning() {
        return this.tickTimer !== undefined;
    }

    private tick() {
        const tickStart = performance.now();
        const tickDuration = (tickStart - this.lastTickTime) / 1000;
        this.lastTickTime = tickStart;

        for (const [_, entity] of this.state.entities) {
            entity.update?.(tickDuration);
        }

        const sendTime = Math.round(tickStart);
        for (const [_, stateManager] of this.state.clients) {
            stateManager.sendState(sendTime);
        }
    }

    public pause() {
        if (this.tickTimer === undefined) {
            return;
        }

        clearInterval(this.tickTimer);
        this.tickTimer = undefined;
    }

    public resume() {
        if (this.tickTimer !== undefined) {
            return;
        }

        this.lastTickTime = performance.now() - this.config.tickInterval;
        this.tickTimer = setInterval(
            () => this.tick(),
            this.config.tickInterval
        );
    }

    public stop(message: string = 'This server has stopped') {
        this.pause();

        this.sendError(null, message);

        for (const provider of this.connectionProviders) {
            provider.disconnect();
        }

        this.rules.serverStopped?.(this);
    }
}
