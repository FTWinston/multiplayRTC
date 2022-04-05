import { IServerEntity } from '../../framework/server/IServerEntity';

export interface IPlayer extends IServerEntity {
    type: 'player';
    x: number;
    y: number;
}
