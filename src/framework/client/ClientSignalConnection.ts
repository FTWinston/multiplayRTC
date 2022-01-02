import {
    SignalConnection,
    IConnectionConfig,
} from '../shared/SignalConnection';

export class ClientSignalConnection extends SignalConnection {
    private readonly peer: RTCPeerConnection;

    constructor(
        settings: IConnectionConfig,
        private readonly sessionId: string,
        private readonly clientName: string,
        join: (peer: RTCPeerConnection) => void,
        disconnected: () => void
    ) {
        super(disconnected, settings);

        this.connectSignal();

        this.peer = this.createPeer();

        // we need a data channel, otherwise it doesn't gather ICE.
        const tempChannel = this.peer.createDataChannel('temp');
        tempChannel.onopen = () => tempChannel.close();

        this.peer.onsignalingstatechange =
        this.peer.oniceconnectionstatechange =
        this.peer.onconnectionstatechange = () => {
            if (process.env.NODE_ENV === 'development') {
                console.log(`client peer connection state changed: ${this.peer.connectionState}, ${this.peer.signalingState}, ${this.peer.iceConnectionState}`);
            }

            if (
                this.peer.connectionState === 'connected'
                && this.peer.signalingState === 'stable'
                && this.peer.iceConnectionState === 'connected'
            ) {
                join(this.peer);
                this.disconnect();
            }
        };
    }

    protected async socketOpened() {
        this.gatherIce(this.peer, this.clientName);

        const offer = await this.peer.createOffer();

        if (process.env.NODE_ENV === 'development') {
            console.log('client set local description');
        }

        await this.peer.setLocalDescription(offer);

        this.send([
            'join',
            this.sessionId,
            this.clientName,
            this.peer.localDescription!.sdp,
        ]);
    }

    protected async receivedMessage(event: MessageEvent) {
        const data: string[] = JSON.parse(event.data);
        const message = data[0];

        if (!Array.isArray(data) || data.length < 1) {
            throw new Error(
                `Unexpected data type received from signal server, expected array but got ${data}`
            );
        }

        if (message === 'answer') {
            await this.receiveAnswer(data[1]);
        } else if (message === 'ice') {
            await this.receiveIce(JSON.parse(data[2]));
        } else {
            throw new Error(
                `Unexpected data received from signal server, expected answer or ice, but got ${message}`
            );
        }
    }

    private async receiveAnswer(answer: string) {
        if (process.env.NODE_ENV === 'development') {
            console.log('client received answer, set remote description');
        }

        await this.peer.setRemoteDescription({
            sdp: answer,
            type: 'answer',
        });
    }

    private async receiveIce(candidate: RTCIceCandidateInit) {
        if (process.env.NODE_ENV === 'development') {
            console.log('client received ice');
        }

        await this.peer.addIceCandidate(candidate);
    }
}
