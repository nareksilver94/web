import { put, call } from 'redux-saga/effects';
import { toastr } from 'react-redux-toastr';

import * as API from './api';

import { actions as AuthActions } from '../auth';

export default function* (error) {
  switch (error.name) {

    case 'TokenExpiredError':
      toastr.error('UnauthorizedError', 'Your session has expired.');

      yield put(AuthActions.setToken(null));
      yield call(API.setTokenHeader, null);

      break;
    
    // Handling global errors

    default:
      toastr.error(error.name, error.message);

      break;
  }
}