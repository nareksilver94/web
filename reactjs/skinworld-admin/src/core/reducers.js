import { combineReducers } from 'redux';
import { reducer as formReducer } from 'redux-form';
import { reducer as toastrReducer } from 'react-redux-toastr';
import coreReducer from './store/reducers';
import { persistReducer } from 'redux-persist';
import storage from 'redux-persist/lib/storage';

import { reducers as AuthReducer } from '../auth';
import { reducers as UserReducer } from '../users';
import { reducers as CaseReducer } from '../cases';
import { reducers as ItemReducer } from '../items';
import { reducers as TransactionReducer } from '../transactions';
import { reducers as WithdrawalReducer } from '../withdrawals';
import { reducers as IPs } from '../ips';
import { reducers as Statistics } from '../statistics';


const rootPersistConfig = {
  key: 'root',
  storage,
  whitelist: ['auth']
}

const appReducer = combineReducers({
  core: coreReducer,
  auth: AuthReducer,
  users: UserReducer,
  cases: CaseReducer,
  items: ItemReducer,
  transactions: TransactionReducer,
  withdrawals: WithdrawalReducer,
  ips: IPs,
  statistics: Statistics,
  toastr: toastrReducer,
  form: formReducer
})

export default persistReducer(rootPersistConfig, appReducer);