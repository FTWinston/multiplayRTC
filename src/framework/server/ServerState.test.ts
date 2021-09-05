import {
    ServerToClientMessageType,
    ServerToClientStateMessage,
} from '../shared/ServerToClientMessage';
import { IServerConfig } from './IServerConfig';
import { IServerEntity } from './IServerEntity';
import { ServerState } from './ServerState';

const fakeServerConfig: IServerConfig = {
    tickInterval: 1,
};

test('basic client state mirroring', () => {
    const clientID = '123';

    const clientSendFunction = jest.fn(
        (message: ServerToClientStateMessage) => {}
    );

    const serverState = new ServerState();

    const entity1id = serverState.addEntity({
        type: 'test',
        field1: 'val1',
        field2: 2,
    } as IServerEntity);

    serverState.addClient(
        {
            clientName: clientID,
            send: clientSendFunction,
        },
        fakeServerConfig
    );

    const entity2id = serverState.addEntity({
        type: 'test',
        field1: 'val3',
        field2: 4,
    } as IServerEntity);

    const entity1 = serverState.getEntity(entity1id);

    (entity1 as any).field1 = 'updated';

    const firstSendTime = 1;
    serverState.update(fakeServerConfig.tickInterval, firstSendTime);

    expect(clientSendFunction.mock.calls.length).toBe(1);
    expect(clientSendFunction.mock.calls[0][0]).toEqual([
        ServerToClientMessageType.FullState,
        new Map<number, Record<string, any>>([
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
        ]),
        firstSendTime,
    ]);
});

test('determineVisibility affects client state', () => {
    const clientID = '123';

    const clientSendFunction = jest.fn(
        (message: ServerToClientStateMessage) => {}
    );

    const serverState = new ServerState();

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

    serverState.addClient(
        {
            clientName: clientID,
            send: clientSendFunction,
        },
        fakeServerConfig
    );

    const entity1 = serverState.getEntity(entity1id);
    const entity2 = serverState.getEntity(entity1id);

    (entity1 as any).field1 = 'updated';
    (entity2 as any).field1 = 'updated';

    const firstSendTime = 1;
    serverState.update(fakeServerConfig.tickInterval, firstSendTime);

    expect(clientSendFunction.mock.calls.length).toBe(1);
    expect(clientSendFunction.mock.calls[0][0]).toEqual([
        ServerToClientMessageType.FullState,
        new Map<number, Record<string, any>>([
            [
                entity1id,
                {
                    type: 'test',
                    field1: 'updated',
                    field2: 2,
                },
            ],
        ]),
        firstSendTime,
    ]);
});

test("null determineFieldsToSend doesn't affect client state", () => {
    const clientID = '123';

    const clientSendFunction = jest.fn(
        (message: ServerToClientStateMessage) => {}
    );

    const serverState = new ServerState();

    const entity1id = serverState.addEntity({
        type: 'test',
        field1: 'val1',
        field2: 2,
        determineFieldsToSend: (client: string) => null,
    } as IServerEntity);

    serverState.addClient(
        {
            clientName: clientID,
            send: clientSendFunction,
        },
        fakeServerConfig
    );

    const entity1 = serverState.getEntity(entity1id);

    (entity1 as any).field1 = 'updated';

    const firstSendTime = 1;
    serverState.update(fakeServerConfig.tickInterval, firstSendTime);

    expect(clientSendFunction.mock.calls.length).toBe(1);
    expect(clientSendFunction.mock.calls[0][0]).toEqual([
        ServerToClientMessageType.FullState,
        new Map<number, Record<string, any>>([
            [
                entity1id,
                {
                    type: 'test',
                    field1: 'updated',
                    field2: 2,
                },
            ],
        ]),
        firstSendTime,
    ]);
});

test('determineFieldsToSend affects client state', () => {
    const clientID = '123';

    const clientSendFunction = jest.fn(
        (message: ServerToClientStateMessage) => {}
    );

    const serverState = new ServerState();

    const entity1id = serverState.addEntity({
        type: 'test',
        field1: 'val1',
        field2: 2,
        determineFieldsToSend: () => ['field1'],
    } as IServerEntity);

    serverState.addClient(
        {
            clientName: clientID,
            send: clientSendFunction,
        },
        fakeServerConfig
    );

    const entity1 = serverState.getEntity(entity1id);

    (entity1 as any).field1 = 'updated';
    (entity1 as any).field2 = 3;

    const firstSendTime = 1;
    serverState.update(fakeServerConfig.tickInterval, firstSendTime);

    expect(clientSendFunction.mock.calls.length).toBe(1);
    expect(clientSendFunction.mock.calls[0][0]).toEqual([
        ServerToClientMessageType.FullState,
        new Map<number, Record<string, any>>([
            [
                entity1id,
                {
                    type: 'test',
                    field1: 'updated',
                },
            ],
        ]),
        firstSendTime,
    ]);
});

test('nested changes affect client full state', () => {
    const clientID = '123';

    const clientSendFunction = jest.fn(
        (message: ServerToClientStateMessage) => {}
    );

    const serverState = new ServerState();

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

    serverState.addClient(
        {
            clientName: clientID,
            send: clientSendFunction,
        },
        fakeServerConfig
    );

    const entity1 = serverState.getEntity(entity1id);

    (entity1 as any).name = 'updated';
    (entity1 as any).position.y = 2;

    expect(clientSendFunction.mock.calls.length).toBe(0);

    const firstSendTime = 1;
    serverState.update(fakeServerConfig.tickInterval, firstSendTime);

    expect(clientSendFunction.mock.calls.length).toBe(1);
    expect(clientSendFunction.mock.calls[0][0]).toEqual([
        ServerToClientMessageType.FullState,
        new Map<number, Record<string, any>>([
            [
                entity1id,
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

    const secondSendTime = 2;
    serverState.update(fakeServerConfig.tickInterval, secondSendTime);

    expect(clientSendFunction.mock.calls.length).toBe(2);
    expect(clientSendFunction.mock.calls[1][0]).toEqual([
        ServerToClientMessageType.FullState,
        new Map<number, Record<string, any>>([
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
        ]),
        secondSendTime,
    ]);
});

test('changes affect client delta state', () => {
    const clientID = '123';

    const clientSendFunction = jest.fn(
        (message: ServerToClientStateMessage) => {}
    );

    const serverState = new ServerState();

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

    serverState.addClient(
        {
            clientName: clientID,
            send: clientSendFunction,
        },
        fakeServerConfig
    );

    let entity1 = serverState.getEntity(entity1id);
    let entity2 = serverState.getEntity(entity2id);

    (entity1 as any).name = 'updated';
    (entity1 as any).score = 6;
    (entity2 as any).name = 'also updated';
    (entity2 as any).score++;

    expect(clientSendFunction.mock.calls.length).toBe(0);

    const firstSendTime = 1;
    serverState.update(fakeServerConfig.tickInterval, firstSendTime);

    expect(clientSendFunction.mock.calls.length).toBe(1);
    expect(clientSendFunction.mock.calls[0][0]).toEqual([
        ServerToClientMessageType.FullState,
        new Map<number, Record<string, any>>([
            [
                entity1id,
                {
                    type: 'test',
                    name: 'updated',
                    score: 6,
                },
            ],
            [
                entity2id,
                {
                    type: 'test',
                    name: 'also updated',
                    score: 1,
                },
            ],
        ]),
        firstSendTime,
    ]);

    // Can't hold onto a proxied entity across updates: re-get.
    entity1 = serverState.getEntity(entity1id);
    entity2 = serverState.getEntity(entity2id);
    (entity1 as any).score = 7;

    // An ack was received, so subsequent send will be a delta.
    serverState.receiveAcknowledge(clientID, firstSendTime);

    const secondSendTime = 2;
    serverState.update(fakeServerConfig.tickInterval, secondSendTime);

    expect(clientSendFunction.mock.calls.length).toBe(2);
    expect(clientSendFunction.mock.calls[1][0]).toEqual([
        ServerToClientMessageType.DeltaState,
        [
            {
                C: {
                    [entity1id]: {
                        s: {
                            score: 7,
                        },
                    },
                },
            },
        ],
        secondSendTime,
    ]);

    entity1 = serverState.getEntity(entity1id);
    entity2 = serverState.getEntity(entity2id);
    (entity2 as any).score = 5;

    const thirdSendTime = 3;
    serverState.update(fakeServerConfig.tickInterval, thirdSendTime);

    expect(clientSendFunction.mock.calls.length).toBe(3);
    expect(clientSendFunction.mock.calls[2][0]).toEqual([
        ServerToClientMessageType.DeltaState,
        [
            {
                C: {
                    [entity1id]: {
                        s: {
                            score: 7,
                        },
                    },
                },
            },
            {
                C: {
                    [entity2id]: {
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
    serverState.receiveAcknowledge(clientID, secondSendTime);

    const fourthSendTime = 4;
    serverState.update(fakeServerConfig.tickInterval, fourthSendTime);
    expect(clientSendFunction.mock.calls.length).toBe(4);
    expect(clientSendFunction.mock.calls[3][0]).toEqual([
        ServerToClientMessageType.DeltaState,
        [
            {
                C: {
                    [entity2id]: {
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
    serverState.receiveAcknowledge(clientID, fourthSendTime);

    const fifthSendTime = 5;
    serverState.update(fakeServerConfig.tickInterval, fifthSendTime);

    expect(clientSendFunction.mock.calls.length).toBe(5);
    expect(clientSendFunction.mock.calls[4][0]).toEqual([
        ServerToClientMessageType.DeltaState,
        [],
        fifthSendTime,
    ]);
});

test('nested changes affect client delta state', () => {
    const clientID = '123';

    const clientSendFunction = jest.fn(
        (message: ServerToClientStateMessage) => {}
    );

    const serverState = new ServerState();

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

    serverState.addClient(
        {
            clientName: clientID,
            send: clientSendFunction,
        },
        fakeServerConfig
    );

    let entity1 = serverState.getEntity(entity1id);
    let entity2 = serverState.getEntity(entity2id);

    (entity1 as any).name = 'updated';
    (entity1 as any).position.y = 2;
    (entity2 as any).name = 'also updated';
    (entity2 as any).position.y = 6;

    expect(clientSendFunction.mock.calls.length).toBe(0);

    const firstSendTime = 1;
    serverState.update(fakeServerConfig.tickInterval, firstSendTime);

    expect(clientSendFunction.mock.calls.length).toBe(1);
    expect(clientSendFunction.mock.calls[0][0]).toEqual([
        ServerToClientMessageType.FullState,
        new Map<number, Record<string, any>>([
            [
                entity1id,
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
        ]),
        firstSendTime,
    ]);

    entity1 = serverState.getEntity(entity1id);
    entity2 = serverState.getEntity(entity2id);
    (entity1 as any).position.z = 3;

    // Unlike the previous test, an ack was received, so subsequent send will be a delta.
    serverState.receiveAcknowledge(clientID, firstSendTime);

    const secondSendTime = 2;

    serverState.update(fakeServerConfig.tickInterval, secondSendTime);

    expect(clientSendFunction.mock.calls.length).toBe(2);
    expect(clientSendFunction.mock.calls[1][0]).toEqual([
        ServerToClientMessageType.DeltaState,
        [
            {
                C: {
                    [entity1id]: {
                        c: {
                            position: {
                                s: {
                                    z: 3,
                                },
                            },
                        },
                    },
                },
            },
        ],
        secondSendTime,
    ]);
});
