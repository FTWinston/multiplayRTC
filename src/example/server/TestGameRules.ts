import { IServerRulesEntity } from '../../framework/server/IServerEntity';
import { IServer } from '../../framework/server/Server';
import { TestClientCommand } from '../shared/TestClientCommand';
import { TestServerEvent } from '../shared/TestServerEvent';
import { Player } from '../shared/Player';
import type { ClientID, EntityID } from '../../framework/server/ServerState';

export class TestGameRules implements IServerRulesEntity<EntityID, TestClientCommand, TestServerEvent> {
    readonly type: 'rules';

    private server: IServer<EntityID, TestServerEvent>;

    serverStarted(server: IServer<EntityID, TestServerEvent>) {
        this.server = server;
    }

    clientJoined(client: ClientID) {
        console.log(`${client} connected`);

        const player: Player = {
            type: 'player',
            x: 0,
            y: 0,
        };

        return this.server.state.addEntity(player);
    }

    clientDisconnected(client: ClientID) {
        console.log(`${client} disconnected`);

        const entityId = this.server.clients.get(client);

        if (entityId !== undefined) {
            this.server.state.deleteEntity(entityId);
        }
    }

    commandReceived(client: ClientID, command: TestClientCommand) {
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
                console.log(`${name} issued unhandled command`, command);
                break;
            }
        }
    }
}
