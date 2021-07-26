import { IServerConfig } from './IServerConfig';
import { IServerRulesEntity } from './IServerEntity';
import { LocalClientConnectionProvider } from './LocalClientConnection';
import { Server } from './Server';
import { WorkerServerSignalConnection } from './WorkerServerSignalConnection';

// To be called from in a web worker.
export function createListenServer<TClientCommand, TServerEvent>(
    rules: IServerRulesEntity<TClientCommand, TServerEvent>,
    config: IServerConfig,
    localName: string
) {
    const localConnectionProvider = new LocalClientConnectionProvider<
        TClientCommand,
        TServerEvent
    >(localName);

    const remoteConnectionProvider = new WorkerServerSignalConnection<
        TClientCommand,
        TServerEvent
    >(config.rtcConfig);

    return new Server<TClientCommand, TServerEvent>(
        rules,
        config,
        localConnectionProvider,
        remoteConnectionProvider
    );
}
