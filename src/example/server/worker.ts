import { TestServer } from './TestServer';
import { LocalClientConnectionProvider } from '../../framework/server/LocalClientConnection';
import { ServerEvent } from '../shared/ServerEvent';
import { ClientCommand } from '../shared/ClientCommand';

export default {} as typeof Worker & (new () => Worker);

console.log('server worker started');

const localConnectionProvider = new LocalClientConnectionProvider<ClientCommand, ServerEvent>('local');

const remoteConnectionProvider = xxx;

const server = new TestServer(localConnectionProvider);
