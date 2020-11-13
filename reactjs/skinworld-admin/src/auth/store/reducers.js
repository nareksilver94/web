
import ActionTypes from './types';

const initialState = {
  token: '',
  loading: false,
  info: {}
}

const authReducer = (state = initialState, action) => {
  switch (action.type) {

    case ActionTypes.API_ATTEMPT:
      return Object.assign({}, state, {
        loading: true
      })

    case ActionTypes.API_SUCCESS:
      return Object.assign({}, state, {
        loading: false
      })

    case ActionTypes.API_FAILED:
      return Object.assign({}, state, {
        loading: false
      })

    case ActionTypes.SET_TOKEN:
      return Object.assign({}, state, {
        token: action.token
      })

    case ActionTypes.SET_USER:
      return Object.assign({}, state, {
        info: action.info,
      })

    case ActionTypes.LOG_OUT:
      return Object.assign({}, state, {
        token: '',
        info: null
      })

    default:
      return state
  }
}

export default authReducer;