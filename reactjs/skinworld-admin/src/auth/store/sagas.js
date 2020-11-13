import { call, put, takeLatest, takeEvery, fork, select } from 'redux-saga/effects';
import { toastr } from 'react-redux-toastr';
import { push } from 'react-router-redux';
import { REHYDRATE } from 'redux-persist';

import * as API from '../../core/api';
import * as AuthActions from './actions';
import errorHandler from '../../core/error-handler';
import ActionTypes from './types';

const {
  setUserInfo, setToken,
  apiAttempt, apiFailed, apiSuccess
} = AuthActions;

const getToken = state => state.auth.token;


function* handleSuccess(response) {
  yield put(apiSuccess());
  yield put(setToken(response.token));
  yield put(setUserInfo(response.user));
  yield call(API.setTokenHeader, response.token);
}

function* loginUser({ data }) {
  try {
    yield put(apiAttempt());
    const response = yield call(API.loginUser, data);

    if (response.ok) {
      const { data } = response.data;
      toastr.success(`Welcome ${data.user.username || data.user.email}!`, 'You \'ve successfully logged in!');
      yield call(handleSuccess, data);
      yield put(push('/'));
    } else {
      yield put(apiFailed());
      yield errorHandler(response.data);
    }

  } catch (err) {
    yield put(apiFailed());
    yield errorHandler(err.response.data);
  }
}

function* rehydrationComplete() {
  const token = yield select(getToken);

  yield call(API.setTokenHeader, token)
}


function* watcher() {
  yield fork(takeLatest, ActionTypes.LOGIN_USER_ATTEMPT, loginUser);
  yield fork(takeEvery, REHYDRATE, rehydrationComplete);
}

export default watcher;