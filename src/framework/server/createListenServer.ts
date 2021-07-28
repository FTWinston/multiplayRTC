import { IServerConfig } from './IServerConfig';
import { IServerRulesEntity } from './IServerEntity';
import { LocalClientConnectionProvider } from './LocalClientConnection';
import { Server } from './Server';
import { WorkerServerSignalConnection } from './WorkerServerSignalConnection';

// To be called from in a web worker.
export function createListenServer<TClientInfo, TClientCommand, TServerEvent>(
    rules: IServerRulesEntity<TClientInfo, TClientCommand, TServerEvent>,
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

    return new Server<TClientInfo, TClientCommand, TServerEvent>(
        rules,
        config,
        localConnectionProvider,
        remoteConnectionProvider
    );
}
