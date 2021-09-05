interface RTCIceServer {
    credential?: string;
    credentialType?: RTCIceCredentialType;
    urls: string | string[];
    username?: string;
}

interface RTCConfiguration {
    bundlePolicy?: RTCBundlePolicy;
    certificates?: RTCCertificate[];
    iceCandidatePoolSize?: number;
    iceServers?: RTCIceServer[];
    iceTransportPolicy?: RTCIceTransportPolicy;
    peerIdentity?: string;
    rtcpMuxPolicy?: RTCRtcpMuxPolicy;
}

export interface IConnectionConfig {
    signalUrl: string;
    rtcConfig: RTCConfiguration;
}

export abstract class SignalConnection {
    private socket: WebSocket;
    protected readonly settings: IConnectionConfig;

    constructor(
        private readonly disconnected: () => void,
        settings: Partial<IConnectionConfig> = {}
    ) {
        this.settings = {
            ...defaultConnectionConfig,
            ...settings,
            rtcConfig: settings.rtcConfig
                ? {
                      ...defaultConnectionConfig.rtcConfig,
                      ...settings.rtcConfig,
                  }
                : defaultConnectionConfig.rtcConfig,
        };
    }

    protected connectSignal() {
        this.socket = new WebSocket(this.settings.signalUrl);

        this.socket.onopen = (event) => this.socketOpened(event);

        this.socket.onmessage = (event) => this.receivedMessage(event);

        this.socket.onclose = (event) => {
            this.disconnected();
        };

        this.socket.onerror = (event) => {
            this.disconnected();
        };
    }

    protected abstract socketOpened(event: Event): Promise<void>;

    protected abstract receivedMessage(event: MessageEvent): Promise<void>;

    protected send(data: Array<string | RTCIceCandidateInit>) {
        if (process.env.NODE_ENV === 'development') {
            console.log('sending ', data);
        }

        this.socket.send(JSON.stringify(data));
    }

    protected createPeer() {
        return new RTCPeerConnection(this.settings.rtcConfig);
    }

    gatherIce(peer: RTCPeerConnection, remoteName: string) {
        peer.onicecandidate = (event) => {
            if (!event.candidate) {
                if (process.env.NODE_ENV === 'development') {
                    console.log('no more ice candidates');
                }
                return;
            }

            if (process.env.NODE_ENV === 'development') {
                console.log('got ice candidate');
            }

            // Don't bother sending ice if already connected.
            if (this.socket.readyState === WebSocket.OPEN) {
                this.send([
                    'ice',
                    remoteName,
                    JSON.stringify(event.candidate.toJSON()),
                ]);
            }
        };
    }

    public get connected() {
        return this.socket.readyState === WebSocket.OPEN;
    }

    public disconnect() {
        this.socket.close();
    }
}

export const defaultConnectionConfig: IConnectionConfig = {
    signalUrl:
        process.env.NODE_ENV === 'production'
            ? 'wss://signal.ftwinston.com'
            : 'ws://localhost:63367',
    rtcConfig: {
        iceCandidatePoolSize: 4,
        iceServers: [
            {
                urls: 'stun:stun.l.google.com:19302',
            },
        ],
    },
};
