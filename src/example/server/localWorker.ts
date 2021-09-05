import { createListenServer } from '../../framework/server/createListenServer';
import { defaultConnectionConfig } from '../../framework/shared/SignalConnection';
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