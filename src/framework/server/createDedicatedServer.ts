import { IServerConfig } from './IServerConfig';
import { IServerRulesEntity } from './IServerEntity';
import { Server } from './Server';
import { ServerSignalConnection } from './ServerSignalConnection';
import { IConnectionConfig } from '../shared/SignalConnection';

// Not to be called from in a web worker.
export function createDedicatedServer<
    TClientInfo,
    TClientCommand,
    TServerEvent
>(
    rules: IServerRulesEntity<TClientInfo, TClientCommand, TServerEvent>,
    serverConfig: IServerConfig,
    connectionConfig: IConnectionConfig
) {
    const remoteConnectionProvider = new ServerSignalConnection<
        TClientCommand,
        TServerEvent
    >(connectionConfig);

    return new Server<TClientInfo, TClientCommand, TServerEvent>(
        rules,
        serverConfig,
        remoteConnectionProvider
    );
}
