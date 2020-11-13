import { call, put, takeLatest, fork } from 'redux-saga/effects';
import { toastr } from 'react-redux-toastr';

import * as API from '../../core/api';
import * as UserActions from './actions';
import errorHandler from '../../core/error-handler';
import ActionTypes from './types';

const {
  getUsersSuccess, getUserDetailSuccess, disableUsersSuccess, editUserSuccess,
  apiAttempt, apiFailed, apiSuccess
} = UserActions;


function* getUsers({ data }) {
  try {
    yield put(apiAttempt());
    const response = yield call(API.getUsers, data);

    if (response.ok) {
      yield put(getUsersSuccess(response.data.data.data, response.data.data.total));
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

function* getUserDetail({ data }) {
  try {
    yield put(apiAttempt());
    const response = yield call(API.getUserDetail, data);

    if (response.ok) {
      yield put(getUserDetailSuccess(response.data.data));
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

function* updateUser({ data }) {
  try {
    yield put(apiAttempt())
    const response = yield call(API.updateUser, data);

    if (response.ok) {
      toastr.success('Success', 'Successfully updated a user.');
      yield put(editUserSuccess(response.data.data));
      yield put(apiSuccess());
    } else {
      yield put(apiFailed());
      yield errorHandler(response.data);
    }

  } catch (err) {
    yield put(apiFailed());
    yield errorHandler(err.response.data);
  }
}

function* disableUsers({ userIds }) {
  try {
    yield put(apiAttempt());
    const response = yield call(API.disableUsers, userIds);

    if (response.ok) {
      let disableMessage = 'Successfully disabled users.';
      if (response.data.length === 1) {
        disableMessage = 'Successfully disabled a user.';
      }
      toastr.success('Success', disableMessage);
      yield put(disableUsersSuccess(response.data.data));
      yield put(apiSuccess());
    } else {
      yield put(apiFailed());
      yield errorHandler(response.data);
    }
  } catch (err) {
    yield put(apiFailed());
    yield errorHandler(err.response.data);
  }
}


function* watcher() {
  yield fork(takeLatest, ActionTypes.GET_USERS_ATTEMPT, getUsers);
  yield fork(takeLatest, ActionTypes.GET_USER_DETAIL_ATTEMPT, getUserDetail);
  yield fork(takeLatest, ActionTypes.EDIT_USER_ATTEMPT, updateUser);
  yield fork(takeLatest, ActionTypes.DISABLE_USERS_ATTEMPT, disableUsers);
}

export default watcher;