import { call, put, takeLatest, fork } from 'redux-saga/effects';
import { toastr } from 'react-redux-toastr';

import * as API from '../../core/api';
import * as ItemActions from './actions';
import errorHandler from '../../core/error-handler';
import ActionTypes from './types';

const {
  getItemsSuccess, createItemSuccess, editItemSuccess,
  uploadItemImageSuccess,
  apiAttempt, apiFailed, apiSuccess
} = ItemActions;


function* getItems({ data }) {
  try {
    yield put(apiAttempt());
    const response = yield call(API.getItems, data);

    if (response.ok) {
      yield put(getItemsSuccess(response.data.data.data, response.data.data.total));
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

function* createItem({ data }) {
  try {
    yield put(apiAttempt())
    const response = yield call(API.createItem, { data });
    if (response.ok) {
      toastr.success('Success', 'Successfully created an item.');
      yield put(createItemSuccess(data));
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

function* editItem({ data }) {
  try {
    yield put(apiAttempt())
    const response = yield call(API.editItem, data);

    if (response.ok) {
      toastr.success('Success', 'Successfully updated an item.');
      yield put(editItemSuccess(data));
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

function* syncItemPrices() {
  try {
    yield put(apiAttempt())
    const response = yield call(API.syncItemPrices);

    if (response.ok) {
      toastr.success('Success', 'Successfully triggered item price sync process!');
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

function* syncItemDescriptions() {
  try {
    yield put(apiAttempt())
    const response = yield call(API.syncItemDescriptions);

    if (response.ok) {
      toastr.success('Success', 'Successfully triggered item description sync process!');
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

function* uploadItemImage({ data }) {
  try {
    yield put(apiAttempt())
    const response = yield call(API.uploadItemImageManual, data);

    if (response.ok) {
      yield put(uploadItemImageSuccess({
        id: data.id,
        data: response.data.data
      }));
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
  yield fork(takeLatest, ActionTypes.GET_ITEMS_ATTEMPT, getItems);
  yield fork(takeLatest, ActionTypes.CREATE_ITEM_ATTEMPT, createItem);
  yield fork(takeLatest, ActionTypes.EDIT_ITEM_ATTEMPT, editItem);
  yield fork(takeLatest, ActionTypes.SYNC_ITEM_PRICES, syncItemPrices);
  yield fork(takeLatest, ActionTypes.SYNC_ITEM_DESCRIPTIONS, syncItemDescriptions);
  yield fork(takeLatest, ActionTypes.UPLOAD_ITEM_IMAGE_ATTEMPT, uploadItemImage);
}

export default watcher;