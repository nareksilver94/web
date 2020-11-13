import { call, put, takeLatest, fork } from 'redux-saga/effects';

import * as API from '../../core/api';
import * as IpActions from './actions';
import errorHandler from '../../core/error-handler';
import ActionTypes from './types';

const {
  getIpsSuccess, getUsersWithIPSuccess,
  apiAttempt, apiFailed, apiSuccess
} = IpActions;


function* getIps({ data }) {
  try {
    yield put(apiAttempt());
    const response = yield call(API.getIps, data);

    if (response.ok) {
      yield put(getIpsSuccess(response.data.data.data, response.data.data.total));
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

function* getUsersWithIP({ data }) {
  try {
    yield put(apiAttempt());
    const response = yield call(API.getUsersWithIP, data);

    if (response.ok) {
      yield put(getUsersWithIPSuccess(response.data.data));
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
  yield fork(takeLatest, ActionTypes.GET_IPS_ATTEMPT, getIps);
  yield fork(takeLatest, ActionTypes.GET_USERS_WITH_IP_ATTEMPT, getUsersWithIP);
}

export default watcher;