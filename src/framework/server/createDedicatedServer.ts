import { IServerConfig } from './IServerConfig';
import { IServerRulesEntity } from './IServerEntity';
import { Server } from './Server';
import { ServerSignalConnection } from './ServerSignalConnection';

// Not to be called from in a web worker.
export function createDedicatedServer<
    TClientInfo,
    TClientCommand,
    TServerEvent
>(
    rules: IServerRulesEntity<TClientInfo, TClientCommand, TServerEvent>,
    config: IServerConfig
) {
    const remoteConnectionProvider = new ServerSignalConnection<
        TClientCommand,
        TServerEvent
    >(config.rtcConfig);

    return new Server<TClientInfo, TClientCommand, TServerEvent>(
        rules,
        config,
        remoteConnectionProvider
    );
}
