import { createTypes } from 'reduxsauce'

export default createTypes(
  `
  GET_ITEMS_ATTEMPT
  GET_ITEMS_SUCCESS

  CREATE_ITEM_ATTEMPT
  CREATE_ITEM_SUCCESS

  EDIT_ITEM_ATTEMPT
  EDIT_ITEM_SUCCESS

  SYNC_ITEM_PRICES
  SYNC_ITEM_DESCRIPTIONS

  UPLOAD_ITEM_IMAGE_ATTEMPT
  UPLOAD_ITEM_IMAGE_SUCCESS

  API_ATTEMPT
  API_SUCCESS
  API_FAILED
  `
)