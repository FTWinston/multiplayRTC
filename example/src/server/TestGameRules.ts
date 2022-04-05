import { IServerRulesEntity, IServer } from 'multiplayrtc';
import { TestClientCommand } from '../shared/TestClientCommand';
import { TestServerEvent } from '../shared/TestServerEvent';
import { Player } from './Player';

export class TestGameRules implements IServerRulesEntity<number, TestClientCommand, TestServerEvent> {
    public readonly type = 'rules';

    private server: IServer<number, TestServerEvent>;

    // TODO: Can we avoid HAVING to do this to avoid trying to send the server?
    determineFieldsToSend() {
        return [];
    }

    serverStarted(server: IServer<number, TestServerEvent>) {
        this.server = server;
    }

    clientJoined(client: string) {
        console.log(`${client} connected`);

        const player = new Player(0, 0);

        return this.server.state.addEntity(player);
    }

    clientDisconnected(client: string) {
        console.log(`${client} disconnected`);

        const entityId = this.server.clients.get(client);

        if (entityId !== undefined) {
            this.server.state.deleteEntity(entityId);
        }
    }

    commandReceived(client: string, command: TestClientCommand) {
        const entityId = this.server.clients.get(client)!;
        const player = this.server.state.entities.get(entityId) as Player;

        switch (command) {
            case 'left': {
                console.log(`${client} moved left`);
                player.x--;
                break;
            }
            case 'right': {
                console.log(`${client} moved right`);
                player.x++;
                break;
            }
            default: {
                console.log(`${client} issued unhandled command`, command);
                break;
            }
        }
    }
}
