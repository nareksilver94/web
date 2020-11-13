
import ActionTypes from './types';
import { findIndex, propEq } from 'ramda';

const initialState = {
  loading: false,
  data: [],
  detail: [],
  total: 0,
  dTotal: 0
};

const userReducer = (state = initialState, action) => {
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

    case ActionTypes.GET_USERS_SUCCESS:
      return Object.assign({}, state, {
        data: action.data,
        total: action.total
      });

    case ActionTypes.GET_USER_DETAIL_SUCCESS:
      return Object.assign({}, state, {
        detail: action.data.data,
        dTotal: action.data.total
      });

    case ActionTypes.EDIT_USER_SUCCESS:
      changedIndex = findIndex(propEq('_id', action.data._id))(state.data);

      if (changedIndex > -1) {
        data = state.data.slice();
        data[changedIndex] = Object.assign(data[changedIndex], action.data);
      }
      
      return Object.assign({}, state, { data });
    
    case ActionTypes.DISABLE_USERS_SUCCESS:
      data.forEach(user => {
        if (action.userIds.indexOf(user._id) !== -1) {
          user.status = 'DISABLED'
        }
      })
      return Object.assign({}, state, { data });

    default:
      return state;
  }
}

export default userReducer;
