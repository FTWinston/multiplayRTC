import { IServerEntity } from 'multiplayrtc/server';

export interface IPlayer extends IServerEntity {
    type: 'player';
    x: number;
    y: number;
}
