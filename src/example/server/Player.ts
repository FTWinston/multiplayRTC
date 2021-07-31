import { IPlayer } from '../shared/IPlayer';

export class Player implements IPlayer {
    type: 'player';

    constructor(public x: number, public y: number) {

    }
    
    update(tickDuration: number) {
        console.log(`updating player at ${this.x}, ${this.y}`);
    }
}