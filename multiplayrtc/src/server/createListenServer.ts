import { IServerConfig } from './IServerConfig';
import { IServerRulesEntity } from './IServerEntity';
import { LocalClientConnectionProvider } from './LocalClientConnection';
import { Server } from './Server';
import { WorkerServerSignalConnection } from './WorkerServerSignalConnection';
import { IConnectionConfig } from '../shared/SignalConnection';

// To be called from in a web worker.
export function createListenServer<TClientInfo, TClientCommand, TServerEvent>(
    rules: IServerRulesEntity<TClientInfo, TClientCommand, TServerEvent>,
    serverConfig: IServerConfig,
    connectionConfig: IConnectionConfig,
    localName: string
) {
    const localConnectionProvider = new LocalClientConnectionProvider<
        TClientCommand,
        TServerEvent
    >(localName);

    const remoteConnectionProvider = new WorkerServerSignalConnection<
        TClientCommand,
        TServerEvent
    >(connectionConfig);

    return new Server<TClientInfo, TClientCommand, TServerEvent>(
        rules,
        serverConfig,
        localConnectionProvider,
        remoteConnectionProvider
    );
}
