import { call, put, takeLatest, fork } from 'redux-saga/effects';

import * as API from '../../core/api';
import * as StatisticsActions from './actions';
import errorHandler from '../../core/error-handler';
import ActionTypes from './types';

const {
  getStatisticsSuccess, apiAttempt, apiFailed, apiSuccess
} = StatisticsActions;


function* getStatistics({ data }) {
  try {
    yield put(apiAttempt());
    const response = yield call(API.getStatistics, data);
    
    if (response.ok) {
      yield put(getStatisticsSuccess(response.data.data.data, response.data.data.total));
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
  yield fork(takeLatest, ActionTypes.GET_STATISTICS_ATTEMPT, getStatistics);
}

export default watcher;