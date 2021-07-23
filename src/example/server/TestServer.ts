import { ClientCommand } from '../shared/ClientCommand';
import { ServerEvent } from '../shared/ServerEvent';
import { ServerState } from './ServerState';
import { Player, ClientState } from '../shared/ClientState';
import { StatefulServer } from '../../framework/server/StatefulServer';
import { IServerToClientConnectionProvider } from '../../framework/server/IServerToClientConnection';

const tickInterval = 500; // this many milliseconds between each server tick

export class TestServer extends StatefulServer<
    ClientCommand,
    ServerEvent
> {
    constructor(
        ...connectionProviders: IServerToClientConnectionProvider<ClientCommand, ServerEvent>[]
    ) {
        super(connectionProviders);
    }

    protected clientJoined(name: string) {
        console.log(`${name} connected`);

        const player: Player = {
            x: 0,
            y: 0,
        };

        this.updateState((state) => {
            state.players[name] = player;
        });
    }

    protected clientQuit(name: string) {
        console.log(`${name} disconnected`);

        this.updateState((state) => {
            delete state.players[name];
        });
    }

    public receiveCommandFromClient(
        name: string,
        command: ClientCommand
    ): void {
        switch (command) {
            case 'left': {
                console.log(`${name} moved left`);

                this.updateState((state) => {
                    const player = state.players[name];
                    if (player !== undefined) {
                        player.x--;
                    }
                });
                break;
            }
            case 'right': {
                console.log(`${name} moved right`);

                this.updateState((state) => {
                    const player = state.players[name];
                    if (player !== undefined) {
                        player.x++;
                    }
                });
                break;
            }
            default: {
                console.log(`${name} issued unhandled command`, command);
                break;
            }
        }
    }

    protected simulateTick(timestep: number): void {
        // TODO: simulate stuff
    }

    protected mapClientState(): FieldMappings<ServerState, ClientState> {
        return {
            rules: {
                active: true,
            },
            players: {
                [anyOtherFields]: {
                    x: true,
                    y: true,
                },
            },
        };
    }
}
