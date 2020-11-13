
import ActionTypes from './types';

const initialState = {
  loading: false,
  data: [],
  total: 0
};

const itemReducer = (state = initialState, action) => {
  let data = state.data.slice();

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

    case ActionTypes.GET_ITEMS_SUCCESS:
      return Object.assign({}, state, {
        data: action.data,
        total: action.total
      });

    case ActionTypes.CREATE_ITEM_SUCCESS:
      return Object.assign({}, state, {
        data: [action.data].concat(data)
      });

    case ActionTypes.EDIT_ITEM_SUCCESS:
      const item = data.find(v => v._id === action.data._id);
      if (item) {
        item.name = action.data.name;
        item.tag = action.data.tag;
      }
      return Object.assign({}, state, { data });
    
    case ActionTypes.DISABLE_ITEMS_SUCCESS:
      data.forEach(item => {
        if (action.itemIds.indexOf(item._id) !== -1) {
          item.status = 'DISABLED'
        }
      })
      return Object.assign({}, state, { data });

    case ActionTypes.UPLOAD_ITEM_IMAGE_SUCCESS:
      const activeItem = data.find(v => v._id === action.data.id);

      if (activeItem) {
        Object.assign(activeItem, action.data.data);
      }

      return Object.assign({}, state, { data });

    default:
      return state;
  }
}

export default itemReducer;