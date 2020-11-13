import { call, put, takeLatest, fork } from 'redux-saga/effects';
import { toastr } from 'react-redux-toastr';

import * as API from '../../core/api';
import * as WithdrawalActions from './actions';
import errorHandler from '../../core/error-handler';
import ActionTypes from './types';

const {
  getWithdrawalsSuccess, editWithdrawalSuccess, removeWithdrawalsSuccess,
  apiAttempt, apiFailed, apiSuccess
} = WithdrawalActions;


function* getWithdrawals({ data }) {
  try {
    yield put(apiAttempt());
    const response = yield call(API.getWithdrawals, data);

    if (response.ok) {
      yield put(getWithdrawalsSuccess(response.data.data.data, response.data.data.total));
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

function* updateWithdrawal({ data }) {
  try {
    yield put(apiAttempt())
    const response = yield call(API.updateWithdrawal, data);

    if (response.ok) {
      toastr.success('Success', 'Successfully updated a withdrawal.');
      yield put(editWithdrawalSuccess(response.data.data));
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

function* removeWithdrawals({ withdrawalIds }) {
  try {
    yield put(apiAttempt())
    const response = yield call(API.removeWithdrawals, withdrawalIds);

    if (response.ok) {
      let disableMessage = 'Successfully removed withdrawals.';
      if (response.data.length === 1) {
        disableMessage = 'Successfully removed a withdrawal.';
      }
      toastr.success('Success', disableMessage);
      yield put(removeWithdrawalsSuccess(response.data.data));
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
  yield fork(takeLatest, ActionTypes.GET_WITHDRAWALS_ATTEMPT, getWithdrawals);
  yield fork(takeLatest, ActionTypes.EDIT_WITHDRAWAL_ATTEMPT, updateWithdrawal);
  yield fork(takeLatest, ActionTypes.REMOVE_WITHDRAWALS_ATTEMPT, removeWithdrawals);
}

export default watcher;