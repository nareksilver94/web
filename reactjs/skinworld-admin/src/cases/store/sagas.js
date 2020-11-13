import { call, put, take, takeLatest, fork } from 'redux-saga/effects';

import { toastr } from 'react-redux-toastr';
import * as API from '../../core/api';
import * as CaseActions from './actions';
import errorHandler from '../../core/error-handler';
import ActionTypes from './types';

const {
  getCaseSuccess, getCasesImagesSuccess, getCasesSuccess, addCaseCategorySuccess,
  removeCaseCategorySuccess, getCaseAttempt, getCasesAttempt, createCaseSuccess,
  updateCasePrioritiesSuccess, updateCaseSuccess, getCasePriceSuccess,
  uploadCaseImageSuccess,
  apiAttempt, apiFailed, apiSuccess,
  addCaseItemSuccess, removeCaseItemSuccess, updateCaseItemSuccess
} = CaseActions;


function* getCase({ data }) {
  try {
    yield put(apiAttempt());
    const response = yield call(API.getCase, data);

    if (response.ok) {
      yield put(getCaseSuccess(response.data.data));
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

function* createCase({ data }) {
  try {
    yield put(apiAttempt())
    const response = yield call(API.createCase, data);

    if (response.ok) {
      toastr.success('Success', 'Successfully created an case.');
      yield put(createCaseSuccess(data));
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

function* getCases({ data }) {
  try {
    yield put(apiAttempt());
    const response = yield call(API.getCases, data);
    if (response.ok) {
      yield put(getCasesSuccess(response.data.data.data, response.data.data.total));
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

function* getCasesImages({ data }) {
  try {
    yield put(apiAttempt());
    const response = yield call(API.getCasesImages, data ? { caseType: data } : null);

    if (response.ok) {
      yield put(getCasesImagesSuccess(response.data.data));
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

function* updateCaseStatus({ data }) {
  try {
    yield put(apiAttempt());

    const { id, isDisabled } = data;
    const api = isDisabled ? API.disableCase : API.enableCase;
    const response = yield call(api, id);

    if (response.ok) {
      yield put(getCasesAttempt());
      yield put(getCaseAttempt(id));
    } else {
      yield put(apiFailed());
      yield errorHandler(response.data.data);
    }

  } catch (err) {
    yield put(apiFailed());
    yield errorHandler(err.response.data);
  }
}

function* addCategory({ data }) {
  try {
    yield put(apiAttempt());
    const response = yield call(API.addCaseCategory, data);

    if (response.ok) {
      yield put(addCaseCategorySuccess(data.category));
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

function* removeCategory({ data }) {
  try {
    yield put(apiAttempt());
    const response = yield call(API.removeCaseCategory, data);

    if (response.ok) {
      yield put(removeCaseCategorySuccess(data.category));
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

function* addCaseItem({ data }) {
  try {
    yield put(apiAttempt());
    const response = yield call(API.addCaseItem, data);

    if (response.ok) {
      yield put(addCaseItemSuccess(data.category));
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

function* removeCaseItem({ data }) {
  try {
    yield put(apiAttempt());
    const response = yield call(API.removeCaseItem, data);

    if (response.ok) {
      yield put(removeCaseItemSuccess(data.category));
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

function* updateCaseItem({ data }) {
  try {
    yield put(apiAttempt());
    const response = yield call(API.updateCaseItem, data);

    if (response.ok) {
      yield put(updateCaseItemSuccess(response.data.data));
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

function* updateCasePriorities({ data }) {
  try {
    yield put(apiAttempt());
    const response = yield call(API.updateCasePriorities, data);

    if (response.ok) {
      yield put(updateCasePrioritiesSuccess(data.category));
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

function* updateCase({ data }) {
  try {
    yield put(apiAttempt());
    const response = yield call(API.updateCase, data);

    if (response.ok) {
      yield put(updateCaseSuccess(response.data.data));
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

function* getCasePrice({ data }) {
  try {
    yield put(apiAttempt());
    const response = yield call(API.getCasePrice, data);

    if (response.ok) {
      yield take(ActionTypes.GET_CASE_SUCCESS);
      yield put(getCasePriceSuccess(response.data.data));
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

function* uploadCaseImage({ data }) {
  try {
    yield put(apiAttempt());
    const response = yield call(API.uploadCaseImageManual, data);

    if (response.ok) {
      yield put(uploadCaseImageSuccess({
        id: data.id,
        data: response.data.data
      }));
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
  yield fork(takeLatest, ActionTypes.GET_CASE_ATTEMPT, getCase);
  yield fork(takeLatest, ActionTypes.GET_CASES_ATTEMPT, getCases);
  yield fork(takeLatest, ActionTypes.CREATE_CASE_ATTEMPT, createCase);
  yield fork(takeLatest, ActionTypes.GET_CASES_IMAGES_ATTEMPT, getCasesImages);
  yield fork(takeLatest, ActionTypes.ADD_CASE_CATEGORY_ATTEMPT, addCategory);
  yield fork(takeLatest, ActionTypes.ADD_CASE_ITEM_ATTEMPT, addCaseItem);
  yield fork(takeLatest, ActionTypes.REMOVE_CASE_CATEGORY_ATTEMPT, removeCategory);
  yield fork(takeLatest, ActionTypes.REMOVE_CASE_ITEM_ATTEMPT, removeCaseItem);
  yield fork(takeLatest, ActionTypes.UPDATE_CASE_STATUS_ATTEMPT, updateCaseStatus);
  yield fork(takeLatest, ActionTypes.UPDATE_CASE_PRIORITIES_ATTEMPT, updateCasePriorities);
  yield fork(takeLatest, ActionTypes.UPDATE_CASE_ATTEMPT, updateCase);
  yield fork(takeLatest, ActionTypes.UPDATE_CASE_ITEM_ATTEMPT, updateCaseItem);
  yield fork(takeLatest, ActionTypes.GET_CASE_PRICE_ATTEMPT, getCasePrice);
  yield fork(takeLatest, ActionTypes.UPLOAD_CASE_IMAGE_ATTEMPT, uploadCaseImage);
}

export default watcher;