import { createOfflineServer } from 'multiplayrtc/server';
import { TestGameRules } from './TestGameRules';

export default {} as typeof Worker & (new () => Worker);

createOfflineServer(new TestGameRules(), {
    tickInterval: 1,
});