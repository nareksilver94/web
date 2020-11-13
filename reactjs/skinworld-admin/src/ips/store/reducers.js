
import ActionTypes from './types';

const initialState = {
  loading: false,
  data: [],
  users: [],
  total: 0
};

const ipReducer = (state = initialState, action) => {

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

    case ActionTypes.GET_IPS_SUCCESS:
      return Object.assign({}, state, {
        data: action.data,
        total: action.total        
      });
    case ActionTypes.GET_USERS_WITH_IP_SUCCESS:
      return Object.assign({}, state, {
        users: action.data
      });

    default:
      return state;
  }
}

export default ipReducer;