import { defaultConnectionConfig } from 'multiplayrtc';
import { createListenServer } from 'multiplayrtc/server';
import { TestGameRules } from './TestGameRules';

export default {} as typeof Worker & (new () => Worker);

// TODO: sort how to pass this in
const localName = 'FIXED NAME TEST';

createListenServer(
    new TestGameRules(),
    { tickInterval: 1, },
    defaultConnectionConfig,
    localName
);