import { TestServer } from './TestServer';
import { createListenServer } from '../../framework/server/createListenServer';

export default {} as typeof Worker & (new () => Worker);

console.log('server worker started');

//const server = new TestServer(localConnectionProvider);

createListenServer(rules, config, localName);