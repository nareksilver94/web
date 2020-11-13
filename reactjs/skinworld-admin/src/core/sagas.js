import { fork } from 'redux-saga/effects';

import coreSaga from './store/sagas';
import authSaga from '../auth/store/sagas';
import userSaga from '../users/store/sagas';
import caseSaga from '../cases/store/sagas';
import itemSaga from '../items/store/sagas';
import transactionSaga from '../transactions/store/sagas';
import withdrawalSaga from '../withdrawals/store/sagas';
import ipSaga from '../ips/store/sagas';
import statisticsSaga from '../statistics/store/sagas';

export default function* () {
  yield fork(coreSaga);
  yield fork(authSaga);
  yield fork(userSaga);
  yield fork(caseSaga);
  yield fork(itemSaga);
  yield fork(transactionSaga);
  yield fork(withdrawalSaga);
  yield fork(ipSaga);
  yield fork(statisticsSaga);
}