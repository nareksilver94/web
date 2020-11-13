
import ActionTypes from './types';

const initialState = {
  breadcrumb: {
    title: ''
  }
}

const coreReducer = (state = initialState, action) => {
  switch (action.type) {
    case ActionTypes.SET_BREADCRUMB_INFO:
      if (state.breadcrumb.title === action.data.title) {
        return state;
      }
      return Object.assign({}, state, {
        breadcrumb: action.data
      });

    default:
      return state;
  }
}

export default coreReducer;