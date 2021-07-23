import { IServerRulesEntity } from './IServerEntity';
import { LocalClientConnectionProvider } from './LocalClientConnection';
import { Server } from './Server';

// To be called from in a web worker.
export function createOfflineServer<TClientCommand, TServerEvent>(
    rules: IServerRulesEntity<TClientCommand, TServerEvent>,
    tickInterval: number
) {
    const localConnectionProvider = new LocalClientConnectionProvider<
        TClientCommand,
        TServerEvent
    >('local');

    return new Server<TClientCommand, TServerEvent>(
        rules,
        tickInterval,
        localConnectionProvider
    );
}
