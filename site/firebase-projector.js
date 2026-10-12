// Projector reads only the sanitized shared draw state.
// No Google login, no anonymous login and no Firebase Auth SDK.
import {connectionStatus} from './open-storage.js';
export {boot,snapshot,subscribe,safe,money,formatted,shortTime} from './open-storage.js';
export const connectionError=()=>connectionStatus().error;
export const hasLiveProjection=()=>connectionStatus().ready;
