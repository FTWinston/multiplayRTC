import { Patch } from 'megapatch/lib/Patch';
import type { ClientState } from '../server/ClientStateManager';

export enum ServerToClientMessageType {
    FullState = 's',
    DeltaState = 'd',
    CommonEvent = 'o',
    Event = 'c',
    Error = 'e',
}

export type CommonEvent =
    | {
          type: 'join';
          client: string;
      }
    | {
          type: 'quit';
          client: string;
      };

export type ServerToClientMessage<TServerEvent> =
    | [ServerToClientMessageType.FullState, ClientState, number]
    | [ServerToClientMessageType.DeltaState, Patch[], number]
    | [ServerToClientMessageType.Event, TServerEvent]
    | [ServerToClientMessageType.CommonEvent, CommonEvent]
    | [ServerToClientMessageType.Error, string];
