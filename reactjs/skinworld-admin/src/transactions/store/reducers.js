
import ActionTypes from './types';

const initialState = {
  loading: false,
  data: [],
  total: 0
};

const transactionReducer = (state = initialState, action) => {
  switch (action.type) {
    case ActionTypes.API_ATTEMPT:
      return Object.assign({}, state, {
        loading: true
      });

    case ActionTypes.API_SUCCESS:
      return Object.assign({}, state, {
        loading: false
      });

    case ActionTypes.API_FAILED:
      return Object.assign({}, state, {
        loading: false
      });

    case ActionTypes.GET_TRANSACTIONS_SUCCESS:
      return Object.assign({}, state, {
        data: action.data,
        total: action.total
      });

    default:
      return state;
  }
}

export default transactionReducer;