
import ActionTypes from './types';

const initialState = {
  loading: false,
  data: [],
  activeCase: null,
  imageLoading: false,
  total: 0
};

const caseReducer = (state = initialState, action) => {
  let activeCase = { ...state.activeCase };

  switch (action.type) {
    case ActionTypes.API_ATTEMPT:
      return Object.assign({}, state, {
        loading: true
      });

    case ActionTypes.GET_CASES_IMAGES_ATTEMPT:
      return Object.assign({}, state, {
        imageLoading: true
      });

    case ActionTypes.API_SUCCESS:
      return Object.assign({}, state, {
        loading: false
      });

    case ActionTypes.API_FAILED:
      return Object.assign({}, state, {
        loading: false
      });

    case ActionTypes.GET_CASES_SUCCESS:
      return Object.assign({}, state, {
        data: action.data,
        total: action.total
      });

    case ActionTypes.CREATE_CASE_SUCCESS:
      return Object.assign({}, state, {
        data: action.data
      });

    case ActionTypes.GET_CASES_IMAGES_SUCCESS:
      return Object.assign({}, state, {
        images: action.data,
        imageLoading: false
      });

    case ActionTypes.GET_CASE_SUCCESS:
      return Object.assign({}, state, {
        activeCase: action.data
      });

    case ActionTypes.GET_CASE_PRICE_SUCCESS:
      return Object.assign({}, state, {
        activeCase: {
          ...state.activeCase,
          originalPrice: action.data.price
        }
      });

    case ActionTypes.ADD_CASE_CATEGORY_SUCCESS:
      activeCase.caseTypes.push(action.data);

      return Object.assign({}, state, { activeCase });

    case ActionTypes.ADD_CASE_ITEM_SUCCESS:
      activeCase.caseTypes.push(action.data);

      return Object.assign({}, state, { activeCase });
    
    case ActionTypes.REMOVE_CASE_CATEGORY_SUCCESS:
      activeCase.caseTypes.splice(activeCase.caseTypes.indexOf(action.data), 1);

      return Object.assign({}, state, { activeCase });

    case ActionTypes.REMOVE_CASE_ITEM_SUCCESS:
      activeCase.caseTypes.splice(activeCase.caseTypes.indexOf(action.data), 1);

      return Object.assign({}, state, { activeCase });      

    case ActionTypes.UPDATE_CASE_ITEM_SUCCESS:
      activeCase = Object.assign(activeCase, action.data);

      return Object.assign({}, state, { activeCase });

    case ActionTypes.UPDATE_CASE_PRIORITIES_SUCCESS:
      activeCase.orders = action.data;

      return Object.assign({}, state, { activeCase });

    case ActionTypes.UPDATE_CASE_SUCCESS:
      activeCase = Object.assign(activeCase, action.data);

      return Object.assign({}, state, { activeCase });

    case ActionTypes.UPLOAD_CASE_IMAGE_SUCCESS:
      const data = state.data.slice();
      activeCase = data.find(v => v._id === action.data.id);

      if (activeCase) {
        Object.assign(activeCase, action.data.data);
      }

      return Object.assign({}, state, { data });

    default:
      return state;
  }
}

export default caseReducer;