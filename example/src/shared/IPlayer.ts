import { IServerEntity } from 'multiplayrtc';

export interface IPlayer extends IServerEntity {
    type: 'player';
    x: number;
    y: number;
}
