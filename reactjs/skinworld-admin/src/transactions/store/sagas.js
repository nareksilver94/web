import { call, put, takeLatest, fork } from 'redux-saga/effects';

import * as API from '../../core/api';
import * as TransactionActions from './actions';
import errorHandler from '../../core/error-handler';
import ActionTypes from './types';

const {
  getTransactionsSuccess, apiAttempt, apiFailed, apiSuccess
} = TransactionActions;


function* getTransactions({ data }) {
  try {
    yield put(apiAttempt());
    const response = yield call(API.getTransactions, data);

    if (response.ok) {
      yield put(getTransactionsSuccess(response.data.data.data, response.data.data.total));
      yield put(apiSuccess());
    } else {
      yield put(apiFailed());
      yield errorHandler(response.data.data);
    }

  } catch (err) {
    yield put(apiFailed());
    yield errorHandler(err.response.data);
  }
}


function* watcher() {
  yield fork(takeLatest, ActionTypes.GET_TRANSACTIONS_ATTEMPT, getTransactions);
}

export default watcher;