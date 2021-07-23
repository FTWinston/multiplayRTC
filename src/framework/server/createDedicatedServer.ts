import { IServerRulesEntity } from './IServerEntity';
import { Server } from './Server';
import { ServerSignalConnection } from './ServerSignalConnection';

// Not to be called from in a web worker.
export function createDedicatedServer<TClientCommand, TServerEvent>(
    rules: IServerRulesEntity<TClientCommand, TServerEvent>,
    rtcConfig: any,
    tickInterval: number
) {
    const remoteConnectionProvider = new ServerSignalConnection<
        TClientCommand,
        TServerEvent
    >(rtcConfig);

    return new Server<TClientCommand, TServerEvent>(
        rules,
        tickInterval,
        remoteConnectionProvider
    );
}
