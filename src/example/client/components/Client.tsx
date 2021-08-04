import * as React from 'react';
import { ConnectionSelector, TypedConnection } from './ConnectionSelector';
import { TestServerEvent } from '../../shared/TestServerEvent';
import { useState } from 'react';
import type { ClientState } from '../../../framework/server/ClientStateManager';
import { CommonEvent } from '../../../framework/shared/ServerToClientMessage';

export const Client: React.FC = () => {
    const [connection, setConnection] = useState<TypedConnection>();
    const [state, setState] = useState<ClientState>(new Map());

    if (connection === undefined) {
        const stateReceived = (prevState: ClientState, state: ClientState) =>
            setState(state);

        const connectionSelected = (connection: TypedConnection) => {
            setConnection(connection);

            connection.sendCommand('shoot');
        };

        // TODO: expose the connection's state (or the connection itself, more likely)
        return (
            <ConnectionSelector
                connectionSelected={connectionSelected}
                receiveEvent={eventReceived}
                receiveCommonEvent={commonEventReceived}
                stateChanged={stateReceived}
            />
        );
    }

    const players: JSX.Element[] = [];

    for (const [id, entity] of state.entries()) {
        if (entity.type === 'player') {
            players.push(
                <div
                    key={id}
                    style={{
                        left: entity.x * 50,
                        margin: '2em 0',
                        position: 'relative',
                    }}
                >
                    {id}
                </div>
            );
        }
    }

    return (
        <div>
            Connected to server
            <button onClick={() => connection!.sendCommand('left')}>
                left
            </button>
            <button onClick={() => connection!.sendCommand('right')}>
                right
            </button>
            <button onClick={() => connection!.sendCommand('shoot')}>
                shoot
            </button>
            {players}
        </div>
    );
};

function eventReceived(cmd: TestServerEvent) {
    console.log('client received event', cmd);
}

function commonEventReceived(cmd: CommonEvent) {
    console.log('client received event', cmd);
}
