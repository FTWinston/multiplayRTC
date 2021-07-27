import { IServerEntity } from '../../framework/server/IServerEntity';

export interface Player extends IServerEntity {
    type: 'player';
    x: number;
    y: number;
}
