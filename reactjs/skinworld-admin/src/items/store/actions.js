import ActionTypes from './types'

export const getItemsAttempt = (data) => ({ type: ActionTypes.GET_ITEMS_ATTEMPT, data })

export const getItemsSuccess = (data, total) => ({ type: ActionTypes.GET_ITEMS_SUCCESS, data, total })

export const createItemAttempt = (data) => ({ type: ActionTypes.CREATE_ITEM_ATTEMPT, data })

export const createItemSuccess = (data) => ({ type: ActionTypes.CREATE_ITEM_SUCCESS, data })

export const editItemAttempt = (data) => ({ type: ActionTypes.EDIT_ITEM_ATTEMPT, data })

export const editItemSuccess = (data) => ({ type: ActionTypes.EDIT_ITEM_SUCCESS, data })

export const syncItemPrices = () => ({ type: ActionTypes.SYNC_ITEM_PRICES })

export const syncItemDescriptions = () => ({ type: ActionTypes.SYNC_ITEM_DESCRIPTIONS })

export const uploadItemImageAttempt = (data) => ({ type: ActionTypes.UPLOAD_ITEM_IMAGE_ATTEMPT, data })

export const uploadItemImageSuccess = (data) => ({ type: ActionTypes.UPLOAD_ITEM_IMAGE_SUCCESS, data })

export const apiAttempt = () => ({ type: ActionTypes.API_ATTEMPT })

export const apiSuccess = () => ({ type: ActionTypes.API_SUCCESS })

export const apiFailed = () => ({ type: ActionTypes.API_FAILED })