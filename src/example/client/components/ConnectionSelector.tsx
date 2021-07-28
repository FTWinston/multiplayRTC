import React, { useState } from 'react';
import { ServerConnection } from '../../../framework/client/ServerConnection';
import { RemoteServerConnection } from '../../../framework/client/RemoteServerConnection';
import { TestClientCommand } from '../../shared/TestClientCommand';
import { TestServerEvent } from '../../shared/TestServerEvent';
import ServerWorker from '../../server/worker';
import { LocalServerConnection } from '../../../framework/client/LocalServerConnection';
import type { ClientState } from '../../../framework/server/ClientStateManager';
import { defaultSignalSettings } from '../../../framework/shared/SignalConnection';

export type TypedConnection = ServerConnection<
    TestClientCommand,
    TestServerEvent
>;

interface IProps {
    receiveEvent: (event: TestServerEvent) => void;
    stateChanged: (prevState: ClientState, state: ClientState) => void;
    connectionSelected: (conn: TypedConnection) => void;
}

export const ConnectionSelector = (props: IProps) => {
    let connection: TypedConnection;
    const ready = () => props.connectionSelected(connection);

    const selectLocal = () => {
        connection = new LocalServerConnection<
            TestClientCommand,
            TestServerEvent
        >({
            worker: new ServerWorker(),
            receiveEvent: (evt) => props.receiveEvent(evt),
            clientStateChanged: (prevState, state) =>
                props.stateChanged(prevState, state),
            receiveError: (msg) => console.error(msg),
        });

        ready();
    };

    const [sessionId, setSessionId] = useState('');

    const [localName, setLocalName] = useState('');

    const selectRemote = () => {
        connection = new RemoteServerConnection<
            TestClientCommand,
            TestServerEvent
        >({
            sessionId,
            signalSettings: defaultSignalSettings,
            clientName: localName,
            receiveEvent: (cmd) => props.receiveEvent(cmd),
            clientStateChanged: (prevState, state) =>
                props.stateChanged(prevState, state),
            receiveError: (msg) => console.error(msg),
            ready,
        });
    };

    return (
        <div>
            <div>
                <input
                    type="text"
                    placeholder="enter your name"
                    value={localName}
                    onChange={(e) => setLocalName(e.target.value)}
                />
            </div>

            <div style={{ marginTop: '2em' }}>
                <button onClick={selectLocal}>Host a local server</button>
            </div>

            <div style={{ marginTop: '2em' }}>
                <input
                    type="text"
                    placeholder="enter server ID"
                    value={sessionId}
                    onChange={(e) => setSessionId(e.target.value)}
                />
                <button
                    onClick={selectRemote}
                    disabled={sessionId.length === 0}
                >
                    Join a remote server
                </button>
            </div>
        </div>
    );
};
