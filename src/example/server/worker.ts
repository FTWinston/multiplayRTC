import { createListenServer } from '../../framework/server/createListenServer';
import { TestGameRules } from './TestGameRules';

export default {} as typeof Worker & (new () => Worker);

console.log('server worker started');

//const server = new TestServer(localConnectionProvider);

createListenServer(new TestGameRules(), config, localName);