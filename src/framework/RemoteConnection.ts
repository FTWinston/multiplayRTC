import { Connection, peerOptions, ConnectionMetadata, ConnectionParameters } from './Connection';
import Peer from 'peerjs';
import { ServerToClientMessage, commandMessageIdentifier, deltaStateMessageIdentifier, fullStateMessageIdentifier, errorMessageIdentifier } from './ServerToClientMessage';
import { acknowledgeMessageIdentifier } from './ClientToServerMessage';

export interface RemoteConnectionParameters<TServerToClientCommand, TClientState>
    extends ConnectionParameters<TServerToClientCommand, TClientState>
{
    initialState: TClientState,
    serverId: string,
    clientName: string,
}

export class RemoteConnection<TClientToServerCommand, TServerToClientCommand, TClientState>
    extends Connection<TClientToServerCommand, TServerToClientCommand, TClientState> {
    private conn: Peer.DataConnection;
    private peer: Peer;
    
    constructor(
        params: RemoteConnectionParameters<TServerToClientCommand, TClientState>,
        ready: () => void,
    ) {
        super(params);

        console.log(`connecting to server ${params.serverId}...`);

        this.peer = new Peer(peerOptions);

        this.peer.on('error', err => {
            console.log('remote connection peer error', err);
        });

        this.peer.on('disconnected', () => {
            console.log('remote connection peer has been disconnected');
        });

        this.peer.on('open', id => {
            console.log(`local client's peer ID is ${id}`);

            const metadata: ConnectionMetadata = {
                name: params.clientName,
            };

            this.conn = this.peer.connect(params.serverId, {
                reliable: false,
                metadata,
            });

            this.conn.on('open', () => {
                console.log(`connected to server`);

                // this.peer.disconnect(); // TODO: once connected to a server, can disconnect this peer immediately?
    
                ready();

                this.conn.on('data', (data: ServerToClientMessage<TServerToClientCommand, TClientState>) => {
                    if (data[0] === commandMessageIdentifier) {
                        this.receiveCommand(data[1]);
                    }
                    else if (data[0] === fullStateMessageIdentifier) {
                        this.sendAcknowledgement(data[2]);
                        this.receiveFullState(data[1]);
                    }
                    else if (data[0] === deltaStateMessageIdentifier) {
                        this.sendAcknowledgement(data[2]);
                        this.receiveDeltaState(data[1]);
                    }
                    else if (data[0] === errorMessageIdentifier) {
                        this.receiveError(data[1]);
                        this.disconnect();
                    }
                    else {
                        console.log('Unrecognised message from server', data);
                    }
                });
            });
        });
    }

    sendCommand(command: TClientToServerCommand) {
        this.conn.send([commandMessageIdentifier, command]);
    }

    sendAcknowledgement(time: number) {
        this.conn.send([acknowledgeMessageIdentifier, time]);
    }

    disconnect() {
        this.conn.close();
        this.peer.destroy();
    }

    get localId() {
        return this.peer.id;
    }
}