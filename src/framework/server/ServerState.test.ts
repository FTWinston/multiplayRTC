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
