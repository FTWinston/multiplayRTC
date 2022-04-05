import { createOfflineServer } from 'multiplayrtc';
import { TestGameRules } from './TestGameRules';

export default {} as typeof Worker & (new () => Worker);

createOfflineServer(new TestGameRules(), {
    tickInterval: 1,
});