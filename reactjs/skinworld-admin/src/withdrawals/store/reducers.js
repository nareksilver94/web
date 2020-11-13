import ActionTypes from './types';
import { findIndex, propEq } from 'ramda';

const initialState = {
  loading: false,
  data: [],
  total: 0
};

const withdrawalReducer = (state = initialState, action) => {
  let changedIndex,
    data = state.data.slice();

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

    case ActionTypes.GET_WITHDRAWALS_SUCCESS:
      return Object.assign({}, state, {
        data: action.data,
        total: action.total
      });

    case ActionTypes.EDIT_WITHDRAWAL_SUCCESS:
      changedIndex = findIndex(propEq("_id", action.data._id))(state.data);

      if (changedIndex > -1) {
        data = state.data.slice();
        data[changedIndex] = Object.assign(data[changedIndex], action.data);
      }

      return Object.assign({}, state, { data });

    case ActionTypes.DISABLE_WITHDRAWALS_SUCCESS:
      data.forEach(withdrawal => {
        if (action.withdrawalIds.indexOf(withdrawal._id) !== -1) {
          withdrawal.status = "DISABLED";
        }
      });
      return Object.assign({}, state, { data });

    case ActionTypes.REMOVE_WITHDRAWALS_SUCCESS:
      const result = data.filter(
        ({ _id }) => !action.withdrawalIds.includes(_id)
      );
      return Object.assign({}, state, { data: result, total: result.length });

    default:
      return state;
  }
};

export default withdrawalReducer;
