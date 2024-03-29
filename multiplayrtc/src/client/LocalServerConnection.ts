import { ServerConnection, ConnectionParameters } from './ServerConnection';
import { ClientToServerMessageType } from '../shared/ClientToServerMessage';
import workerRTC from 'worker-webrtc/window';

export interface LocalConnectionParameters<TServerEvent>
    extends ConnectionParameters<TServerEvent> {
    worker: Worker;
}

export class LocalServerConnection<
    TClientCommand,
    TServerEvent
> extends ServerConnection<TClientCommand, TServerEvent> {
    constructor(params: LocalConnectionParameters<TServerEvent>) {
        super(params);
        this.worker = params.worker;
        workerRTC(this.worker);
        this.worker.onmessage = (e) => this.receiveMessageFromServer(e.data);
    }

    private readonly worker: Worker;

    public override sendCommand(command: TClientCommand) {
        this.worker.postMessage([ClientToServerMessageType.Command, command]);
    }

    protected override sendAcknowledge(time: number) {
        this.worker.postMessage([ClientToServerMessageType.Acknowledge, time]);
    }

    protected override sendQuit() {
        this.worker.postMessage([ClientToServerMessageType.Quit]);
    }

    public override disconnect() {
        this.sendQuit();

        this.worker.terminate();
    }

    // TODO: these
    /*
        get localId() {
        return this.clientName;
    }

    get sessionId() {
        return this._sessionId;
    }
    */

    get localId() {
        return 'local';
    }

    get sessionId() {
        return '';
    }
}
