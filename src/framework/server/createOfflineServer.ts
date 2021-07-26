import { IServerConfig } from './IServerConfig';
import { IServerRulesEntity } from './IServerEntity';
import { LocalClientConnectionProvider } from './LocalClientConnection';
import { Server } from './Server';

// To be called from in a web worker.
export function createOfflineServer<TClientCommand, TServerEvent>(
    rules: IServerRulesEntity<TClientCommand, TServerEvent>,
    config: Omit<IServerConfig, 'rtcConfig'>
) {
    const localConnectionProvider = new LocalClientConnectionProvider<
        TClientCommand,
        TServerEvent
    >('local');

    return new Server<TClientCommand, TServerEvent>(
        rules,
        { ...config, rtcConfig: {} },
        localConnectionProvider
    );
}
