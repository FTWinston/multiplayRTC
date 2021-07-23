import { IServerRulesEntity } from './IServerEntity';
import { LocalClientConnectionProvider } from './LocalClientConnection';
import { Server } from './Server';
import { WorkerServerSignalConnection } from './WorkerServerSignalConnection';

// To be called from in a web worker.
export function createListenServer<TClientCommand, TServerEvent>(
    rules: IServerRulesEntity<TClientCommand, TServerEvent>,
    localName: string,
    rtcConfig: any,
    tickInterval: number
) {
    const localConnectionProvider = new LocalClientConnectionProvider<
        TClientCommand,
        TServerEvent
    >(localName);

    const remoteConnectionProvider = new WorkerServerSignalConnection<
        TClientCommand,
        TServerEvent
    >(rtcConfig);

    return new Server<TClientCommand, TServerEvent>(
        rules,
        tickInterval,
        localConnectionProvider,
        remoteConnectionProvider
    );
}
