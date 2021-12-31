import { Patch } from 'megapatch';
import { ClientState } from './entityTypes';

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

export type ServerToClientStateMessage =
    | [ServerToClientMessageType.FullState, ClientState, number]
    | [ServerToClientMessageType.DeltaState, Patch[], number];

export type ServerToClientMessage<TServerEvent> =
    | ServerToClientStateMessage
    | [ServerToClientMessageType.Event, TServerEvent]
    | [ServerToClientMessageType.CommonEvent, CommonEvent]
    | [ServerToClientMessageType.Error, string];
