import {
    RemoteConnectionParameters,
    RemoteServerConnection,
} from './RemoteServerConnection';
import {
    LocalConnectionParameters,
    LocalServerConnection,
} from './LocalServerConnection';
import { ServerConnection } from './ServerConnection';
import { IEvent } from '../shared/ServerToClientMessage';

export type OnlineConnectionParameters<
    TServerEvent,
    TClientState,
    TLocalState extends {} = {}
> =
    | (RemoteConnectionParameters<TServerEvent, TClientState, TLocalState> & {
          mode: 'join';
      })
    | (LocalConnectionParameters<TServerEvent, TClientState, TLocalState> & {
          mode: 'host';
      });

export function createOnlineConnection<
    TClientCommand,
    TServerEvent,
    TClientState extends {},
    TLocalState extends {} = {}
>(
    params: OnlineConnectionParameters<TServerEvent, TClientState, TLocalState>
): ServerConnection<TClientCommand, TServerEvent, TClientState, TLocalState> {
    return params.mode === 'host'
        ? new LocalServerConnection<
              TClientCommand,
              TServerEvent,
              TClientState,
              TLocalState
          >(params)
        : new RemoteServerConnection<
              TClientCommand,
              TServerEvent,
              TClientState,
              TLocalState
          >(params);
}
