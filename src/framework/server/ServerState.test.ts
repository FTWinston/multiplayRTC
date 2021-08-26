import {
    ServerToClientMessageType,
    ServerToClientStateMessage,
} from '../shared/ServerToClientMessage';
import { ClientStateManager } from './ClientStateManager';
import { IServerEntity } from './IServerEntity';
import { ServerState } from './ServerState';

test('basic client state mirroring', () => {
    const clientID = '123';
    const serverState = new ServerState();
    const clientStateManager = new ClientStateManager(
        {
            clientName: clientID,
            send: () => {},
        },
        serverState.entities,
        {
            rtcConfig: {},
            tickInterval: 1,
        }
    );

    const entity1id = serverState.addEntity({
        type: 'test',
        field1: 'val1',
        field2: 2,
    } as IServerEntity);

    serverState.addClient(clientID, clientStateManager);

    const entity2id = serverState.addEntity({
        type: 'test',
        field1: 'val3',
        field2: 4,
    } as IServerEntity);

    const entity1 = serverState.getEntity(entity1id);

    (entity1 as any).field1 = 'updated';

    clientStateManager.update();

    expect(clientStateManager.entities).toEqual(
        new Map([
            [
                entity1id,
                {
                    type: 'test',
                    field1: 'updated',
                    field2: 2,
                },
            ],
            [
                entity2id,
                {
                    type: 'test',
                    field1: 'val3',
                    field2: 4,
                },
            ],
        ])
    );
});

test('determineVisibility affects client state', () => {
    const clientID = '123';
    const serverState = new ServerState();
    const clientStateManager = new ClientStateManager(
        {
            clientName: clientID,
            send: () => {},
        },
        serverState.entities,
        {
            rtcConfig: {},
            tickInterval: 1,
        }
    );

    const entity1id = serverState.addEntity({
        type: 'test',
        field1: 'val1',
        field2: 2,
        determineVisibility: (client: string) => {
            return client === clientID;
        },
    } as IServerEntity);

    const entity2id = serverState.addEntity({
        type: 'test',
        field1: 'val1',
        field2: 2,
        determineVisibility: (client: string) => {
            return client !== clientID;
        },
    } as IServerEntity);

    serverState.addClient(clientID, clientStateManager);

    const entity1 = serverState.getEntity(entity1id);
    const entity2 = serverState.getEntity(entity1id);

    (entity1 as any).field1 = 'updated';
    (entity2 as any).field1 = 'updated';

    clientStateManager.update();

    expect(clientStateManager.entities).toEqual(
        new Map([
            [
                entity1id,
                {
                    type: 'test',
                    field1: 'updated',
                    field2: 2,
                },
            ],
        ])
    );
});

test("null determineFieldsToSend doesn't affect client state", () => {
    const clientID = '123';
    const serverState = new ServerState();
    const clientStateManager = new ClientStateManager(
        {
            clientName: clientID,
            send: () => {},
        },
        serverState.entities,
        {
            rtcConfig: {},
            tickInterval: 1,
        }
    );

    const entity1id = serverState.addEntity({
        type: 'test',
        field1: 'val1',
        field2: 2,
        determineFieldsToSend: (client: string) => null,
    } as IServerEntity);

    serverState.addClient(clientID, clientStateManager);

    const entity1 = serverState.getEntity(entity1id);

    (entity1 as any).field1 = 'updated';

    clientStateManager.update();

    expect(clientStateManager.entities).toEqual(
        new Map([
            [
                entity1id,
                {
                    type: 'test',
                    field1: 'updated',
                    field2: 2,
                },
            ],
        ])
    );
});

test('determineFieldsToSend affects client state', () => {
    const clientID = '123';
    const serverState = new ServerState();
    const clientStateManager = new ClientStateManager(
        {
            clientName: clientID,
            send: () => {},
        },
        serverState.entities,
        {
            rtcConfig: {},
            tickInterval: 1,
        }
    );

    const entity1id = serverState.addEntity({
        type: 'test',
        field1: 'val1',
        field2: 2,
        determineFieldsToSend: () => ['field1'],
    } as IServerEntity);

    serverState.addClient(clientID, clientStateManager);

    const entity1 = serverState.getEntity(entity1id);

    (entity1 as any).field1 = 'updated';
    (entity1 as any).field2 = 3;

    clientStateManager.update();

    expect(clientStateManager.entities).toEqual(
        new Map([
            [
                entity1id,
                {
                    type: 'test',
                    field1: 'updated',
                },
            ],
        ])
    );
});

test('nested changes affect client full state', () => {
    const clientID = '123';

    const clientSendFunction = jest.fn(
        (message: ServerToClientStateMessage) => {}
    );

    const serverState = new ServerState();
    const clientStateManager = new ClientStateManager(
        {
            clientName: clientID,
            send: clientSendFunction,
        },
        serverState.entities,
        {
            rtcConfig: {},
            tickInterval: 1,
        }
    );

    const entity1id = serverState.addEntity({
        type: 'test',
        name: 'something',
        position: {
            x: 1,
            y: 1,
            z: 1,
        },
        determineFieldsToSend: () => ['name', 'position'],
    } as IServerEntity);

    serverState.addClient(clientID, clientStateManager);

    const entity1 = serverState.getEntity(entity1id);

    (entity1 as any).name = 'updated';
    (entity1 as any).position.y = 2;

    clientStateManager.update();

    expect(clientSendFunction.mock.calls.length).toBe(0);

    const firstSendTime = 1;
    clientStateManager.sendState(firstSendTime);
    expect(clientSendFunction.mock.calls.length).toBe(1);
    expect(clientSendFunction.mock.calls[0][0]).toEqual([
        ServerToClientMessageType.FullState,
        new Map<number, Record<string, any>>([
            [
                1,
                {
                    type: 'test',
                    name: 'updated',
                    position: {
                        x: 1,
                        y: 2,
                        z: 1,
                    },
                },
            ],
        ]),
        firstSendTime,
    ]);

    (entity1 as any).position.z = 3;

    clientStateManager.update();

    const secondSendTime = 2;
    clientStateManager.sendState(secondSendTime);
    expect(clientSendFunction.mock.calls.length).toBe(2);
    expect(clientSendFunction.mock.calls[1][0]).toEqual([
        ServerToClientMessageType.FullState,
        new Map<number, Record<string, any>>([
            [
                1,
                {
                    type: 'test',
                    name: 'updated',
                    position: {
                        x: 1,
                        y: 2,
                        z: 3,
                    },
                },
            ],
        ]),
        secondSendTime,
    ]);

    expect(clientStateManager.entities).toEqual(
        new Map([
            [
                entity1id,
                {
                    type: 'test',
                    name: 'updated',
                    position: {
                        x: 1,
                        y: 2,
                        z: 3,
                    },
                },
            ],
        ])
    );
});

test('changes affect client delta state', () => {
    const clientID = '123';

    const clientSendFunction = jest.fn(
        (message: ServerToClientStateMessage) => {}
    );

    const serverState = new ServerState();
    const clientStateManager = new ClientStateManager(
        {
            clientName: clientID,
            send: clientSendFunction,
        },
        serverState.entities,
        {
            rtcConfig: {},
            tickInterval: 1,
        }
    );

    const entity1id = serverState.addEntity({
        type: 'test',
        name: 'something',
        score: 5,
        determineFieldsToSend: () => ['name', 'score'],
    } as IServerEntity);

    const entity2id = serverState.addEntity({
        type: 'test',
        name: 'something else',
        score: 0,
        determineFieldsToSend: () => ['name', 'score'],
    } as IServerEntity);

    serverState.addClient(clientID, clientStateManager);

    const entity1 = serverState.getEntity(entity1id);
    const entity2 = serverState.getEntity(entity2id);

    (entity1 as any).name = 'updated';
    (entity1 as any).score = 6;
    (entity2 as any).name = 'also updated';
    (entity2 as any).score++;

    clientStateManager.update();

    expect(clientSendFunction.mock.calls.length).toBe(0);

    const firstSendTime = 1;
    clientStateManager.sendState(firstSendTime);
    expect(clientSendFunction.mock.calls.length).toBe(1);
    expect(clientSendFunction.mock.calls[0][0]).toEqual([
        ServerToClientMessageType.FullState,
        new Map<number, Record<string, any>>([
            [
                1,
                {
                    type: 'test',
                    name: 'updated',
                    score: 6,
                },
            ],
            [
                2,
                {
                    type: 'test',
                    name: 'also updated',
                    score: 1,
                },
            ],
        ]),
        firstSendTime,
    ]);

    (entity1 as any).score = 7;

    clientStateManager.update();

    // An ack was received, so subsequent send will be a delta.
    clientStateManager.receiveAcknowledge(firstSendTime);

    const secondSendTime = 2;
    clientStateManager.sendState(secondSendTime);
    expect(clientSendFunction.mock.calls.length).toBe(2);
    expect(clientSendFunction.mock.calls[1][0]).toEqual([
        ServerToClientMessageType.DeltaState,
        [
            {
                C: {
                    1: {
                        s: {
                            score: 7,
                        },
                    },
                },
            },
        ],
        secondSendTime,
    ]);

    (entity2 as any).score = 5;

    clientStateManager.update();

    const thirdSendTime = 3;
    clientStateManager.sendState(thirdSendTime);
    expect(clientSendFunction.mock.calls.length).toBe(3);
    expect(clientSendFunction.mock.calls[2][0]).toEqual([
        ServerToClientMessageType.DeltaState,
        [
            {
                C: {
                    1: {
                        s: {
                            score: 7,
                        },
                    },
                },
            },
            {
                C: {
                    2: {
                        s: {
                            score: 5,
                        },
                    },
                },
            },
        ],
        thirdSendTime,
    ]);

    // An ack was received, so subsequent send will only send third state.
    clientStateManager.receiveAcknowledge(secondSendTime);

    const fourthSendTime = 4;
    clientStateManager.sendState(fourthSendTime);
    expect(clientSendFunction.mock.calls.length).toBe(4);
    expect(clientSendFunction.mock.calls[3][0]).toEqual([
        ServerToClientMessageType.DeltaState,
        [
            {
                C: {
                    2: {
                        s: {
                            score: 5,
                        },
                    },
                },
            },
        ],
        fourthSendTime,
    ]);

    // An ack was received, so subsequent send will have no changes
    clientStateManager.receiveAcknowledge(fourthSendTime);

    const fifthSendTime = 5;
    clientStateManager.sendState(fifthSendTime);
    expect(clientSendFunction.mock.calls.length).toBe(5);
    expect(clientSendFunction.mock.calls[4][0]).toEqual([
        ServerToClientMessageType.DeltaState,
        [],
        fifthSendTime,
    ]);

    expect(clientStateManager.entities).toEqual(
        new Map([
            [
                entity1id,
                {
                    type: 'test',
                    name: 'updated',
                    score: 7,
                },
            ],
            [
                entity2id,
                {
                    type: 'test',
                    name: 'also updated',
                    score: 5,
                },
            ],
        ])
    );
});

test('nested changes affect client delta state', () => {
    const clientID = '123';

    const clientSendFunction = jest.fn(
        (message: ServerToClientStateMessage) => {}
    );

    const serverState = new ServerState();
    const clientStateManager = new ClientStateManager(
        {
            clientName: clientID,
            send: clientSendFunction,
        },
        serverState.entities,
        {
            rtcConfig: {},
            tickInterval: 1,
        }
    );

    const entity1id = serverState.addEntity({
        type: 'test',
        name: 'something',
        position: {
            x: 1,
            y: 1,
            z: 1,
        },
        determineFieldsToSend: () => ['name', 'position'],
    } as IServerEntity);

    const entity2id = serverState.addEntity({
        type: 'test',
        name: 'something else',
        position: {
            x: 5,
            y: 5,
            z: 5,
        },
        determineFieldsToSend: () => ['name', 'position'],
    } as IServerEntity);

    serverState.addClient(clientID, clientStateManager);

    const entity1 = serverState.getEntity(entity1id);
    const entity2 = serverState.getEntity(entity2id);

    (entity1 as any).name = 'updated';
    (entity1 as any).position.y = 2;
    (entity2 as any).name = 'also updated';
    (entity2 as any).position.y = 6;

    clientStateManager.update();

    expect(clientSendFunction.mock.calls.length).toBe(0);

    const firstSendTime = 1;
    clientStateManager.sendState(firstSendTime);
    expect(clientSendFunction.mock.calls.length).toBe(1);
    expect(clientSendFunction.mock.calls[0][0]).toEqual([
        ServerToClientMessageType.FullState,
        new Map<number, Record<string, any>>([
            [
                1,
                {
                    type: 'test',
                    name: 'updated',
                    position: {
                        x: 1,
                        y: 2,
                        z: 1,
                    },
                },
            ],
            [
                2,
                {
                    type: 'test',
                    name: 'also updated',
                    position: {
                        x: 5,
                        y: 6,
                        z: 5,
                    },
                },
            ],
        ]),
        firstSendTime,
    ]);

    (entity1 as any).position.z = 3;

    clientStateManager.update();

    // Unlike the previous test, an ack was received, so subsequent send will be a delta.
    clientStateManager.receiveAcknowledge(firstSendTime);

    const secondSendTime = 2;
    clientStateManager.sendState(secondSendTime);
    expect(clientSendFunction.mock.calls.length).toBe(2);
    expect(clientSendFunction.mock.calls[1][0]).toEqual([
        ServerToClientMessageType.DeltaState,
        [
            {
                s: [
                    [
                        1,
                        {
                            // TODO: Currently this resends every entity in full.
                            // That ain't right...
                            position: {
                                // TODO: Only the changed z should show here.
                                // Not sure of exact megapatch syntax for this.
                                z: 3,
                            },
                        },
                    ],
                ],
            },
        ],
        secondSendTime,
    ]);

    expect(clientStateManager.entities).toEqual(
        new Map([
            [
                entity1id,
                {
                    type: 'test',
                    name: 'updated',
                    position: {
                        x: 1,
                        y: 2,
                        z: 3,
                    },
                },
            ],
            [
                entity2id,
                {
                    type: 'test',
                    name: 'also updated',
                    position: {
                        x: 5,
                        y: 6,
                        z: 5,
                    },
                },
            ],
        ])
    );
});
