import { IServerConfig } from './IServerConfig';
import { IServerRulesEntity } from './IServerEntity';
import { Server } from './Server';
import { ServerSignalConnection } from './ServerSignalConnection';

// Not to be called from in a web worker.
export function createDedicatedServer<TClientCommand, TServerEvent>(
    rules: IServerRulesEntity<TClientCommand, TServerEvent>,
    config: IServerConfig
) {
    const remoteConnectionProvider = new ServerSignalConnection<
        TClientCommand,
        TServerEvent
    >(config.rtcConfig);

    return new Server<TClientCommand, TServerEvent>(
        rules,
        config,
        remoteConnectionProvider
    );
}
