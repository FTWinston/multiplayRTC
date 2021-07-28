import { createOfflineServer } from '../../framework/server/createOfflineServer';
import { TestGameRules } from './TestGameRules';

export default {} as typeof Worker & (new () => Worker);

console.log('server worker started');

createOfflineServer(new TestGameRules(), {
    tickInterval: 1/10,
});