import {
    SignalConnection,
    IConnectionConfig,
} from '../shared/SignalConnection';
import {
    IServerToClientConnection,
    IServerToClientConnectionProvider,
} from './IServerToClientConnection';
import { RemoteClientConnection } from './RemoteClientConnection';

export class ServerSignalConnection<TClientCommand, TServerEvent>
    extends SignalConnection
    implements IServerToClientConnectionProvider<TClientCommand, TServerEvent>
{
    private connectingPeers: Map<string, RTCPeerConnection>;

    constructor(settings: IConnectionConfig) {
        super(() => this.serverDisconnected(), settings);

        this.connectingPeers = new Map<string, RTCPeerConnection>();
    }

    private clientConnectedCallback?: (
        connection: IServerToClientConnection<TClientCommand, TServerEvent>
    ) => boolean;

    private clientDisconnectedCallback?: (
        connection: IServerToClientConnection<TClientCommand, TServerEvent>
    ) => void;

    private serverDisconnectedCallback?: () => void;

    private serverConnectSuccessCallback?: (id: string) => void;
    private serverConnectFailCallback?: (reason: string) => void;

    private serverDisconnected() {
        if (this.serverConnectFailCallback) {
            this.serverConnectFailCallback('disconnected');
            delete this.serverConnectSuccessCallback;
            delete this.serverConnectFailCallback;
        }

        this.serverDisconnectedCallback?.();
    }

    public async connect(args: {
        serverDisconnected: () => void;
        clientConnected: (
            connection: IServerToClientConnection<TClientCommand, TServerEvent>
        ) => boolean;
        clientDisconnected: (
            connection: IServerToClientConnection<TClientCommand, TServerEvent>
        ) => void;
    }) {
        this.serverDisconnectedCallback = args.serverDisconnected;
        this.clientConnectedCallback = args.clientConnected;
        this.clientDisconnectedCallback = args.clientDisconnected;

        return await new Promise<string>((resolve, reject) => {
            this.serverConnectSuccessCallback = resolve;
            this.serverConnectFailCallback = reject;
            this.connectSignal();
        });
    }

    protected async socketOpened() {
        this.send(['host']);
    }

    protected async receivedMessage(event: MessageEvent) {
        const data: string[] = JSON.parse(event.data);
        const message = data[0];

        if (!Array.isArray(data) || data.length < 1) {
            throw new Error(
                `Unexpected data type received from signal server, expected array but got ${data}`
            );
        }

        if (message === 'id') {
            this.receiveSessionId(data[1]);
        } else if (message === 'join') {
            await this.receiveJoin(data[1], data[2]);
        } else if (message === 'ice') {
            await this.receiveIce(data[1], data[2]);
        } else {
            throw new Error(
                `Unexpected data received from signal server, expected id, join or ice, but got ${message}`
            );
        }
    }

    protected createConnection(name: string, peer: RTCPeerConnection) {
        return new RemoteClientConnection<TClientCommand, TServerEvent>(
            name,
            peer,
            (connection) => this.clientConnectedCallback?.(connection),
            (connection) => this.clientDisconnectedCallback?.(connection)
        );
    }

    private receiveSessionId(id: string) {
        if (!this.serverConnectSuccessCallback) return;

        this.serverConnectSuccessCallback(id);
        delete this.serverConnectSuccessCallback;
        delete this.serverConnectFailCallback;
    }

    private async receiveJoin(name: string, offer: string) {
        name = name.trim();

        if (!this.isValidName(name)) {
            this.send([
                'reject',
                name,
                'Name should be 1 to 20 characters long.',
            ]);
            return;
        }

        if (process.env.NODE_ENV === 'development') {
            console.log(`received join from ${name}`);
        }

        const peer = this.createPeer();

        this.connectingPeers.set(name, peer);

        peer.onsignalingstatechange = 
        peer.oniceconnectionstatechange
        peer.onconnectionstatechange = () => {
            if (process.env.NODE_ENV === 'development') {
                console.log(`server peer state changed: ${peer.connectionState}, ${peer.signalingState}, ${peer.iceConnectionState}`);
            }

            if (
                this.connectingPeers.has(name)
                && peer.signalingState === 'stable'
                && peer.iceConnectionState === 'connected'
            ) {
                this.connectingPeers.delete(name);

                const clientConnection = this.createConnection(name, peer);
                if (!this.clientConnectedCallback?.(clientConnection)) {
                    // TODO: handle rejection
                }
            }
        };

        this.gatherIce(peer, name);

        if (process.env.NODE_ENV === 'development') {
            console.log('server set remote description');
        }

        await peer.setRemoteDescription({
            sdp: offer,
            type: 'offer',
        });

        if (process.env.NODE_ENV === 'development') {
            console.log('server creating answer');
        }
        const answer = await peer.createAnswer();

        if (process.env.NODE_ENV === 'development') {
            console.log('server set local description');
        }

        await peer.setLocalDescription(answer);

        this.send(['accept', name, peer.localDescription!.sdp]);
    }

    private isValidName(name: string) {
        return name.length >= 1 && name.length <= 20;
    }

    private async receiveIce(name: string, data: string) {
        if (process.env.NODE_ENV === 'development') {
            console.log(`server received ice from ${name}`);
        }

        const peer = this.connectingPeers.get(name);

        if (peer) {
            await peer.addIceCandidate(JSON.parse(data));
        } else if (process.env.NODE_ENV === 'development') {
            console.log(
                `Received ice that isn't from a connecting client: ${name}`
            );
        }
    }
}
