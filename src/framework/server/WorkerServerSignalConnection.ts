import { RTCPeerConnection } from 'worker-webrtc/worker';
import { IConnectionConfig } from '../shared/SignalConnection';
import { ServerSignalConnection } from './ServerSignalConnection';

export class WorkerServerSignalConnection<
    TClientCommand,
    TServerEvent
> extends ServerSignalConnection<TClientCommand, TServerEvent> {
    constructor(settings: IConnectionConfig) {
        super(settings);
    }

    protected override createPeer() {
        return new RTCPeerConnection(this.settings.rtcConfig);
    }
}
