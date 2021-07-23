import { IConnectionSettings } from '../shared/SignalConnection';
import { ServerSignalConnection } from './ServerSignalConnection';

import { RTCPeerConnection } from 'worker-webrtc/worker';

export class WorkerServerSignalConnection<
    TClientCommand,
    TServerEvent
> extends ServerSignalConnection<TClientCommand, TServerEvent> {
    constructor(settings: IConnectionSettings) {
        super(settings);
    }

    protected override createPeer() {
        return new RTCPeerConnection(this.settings.rtcConfig);
    }
}
