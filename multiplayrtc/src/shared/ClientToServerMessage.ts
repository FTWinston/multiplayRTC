export enum ClientToServerMessageType {
    Command = 'c',
    Acknowledge = 'a',
    Quit = 'q',
}

export type ClientToServerMessage<TClientCommand> =
    | [ClientToServerMessageType.Acknowledge, number]
    | [ClientToServerMessageType.Command, TClientCommand]
    | [ClientToServerMessageType.Quit];
