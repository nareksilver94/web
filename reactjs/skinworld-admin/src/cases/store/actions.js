import ActionTypes from './types'

export const getCasesAttempt = (data) => ({ type: ActionTypes.GET_CASES_ATTEMPT, data })

export const getCasesSuccess = (data, total) => ({ type: ActionTypes.GET_CASES_SUCCESS, data, total })

export const createCaseAttempt = (data) => ({ type: ActionTypes.CREATE_CASE_ATTEMPT, data })

export const createCaseSuccess = (data) => ({ type: ActionTypes.CREATE_CASE_SUCCESS, data })

export const getCasesImagesAttempt = (data) => ({ type: ActionTypes.GET_CASES_IMAGES_ATTEMPT, data })

export const getCasesImagesSuccess = (data) => ({ type: ActionTypes.GET_CASES_IMAGES_SUCCESS, data })

export const getCaseAttempt = (data) => ({ type: ActionTypes.GET_CASE_ATTEMPT, data })

export const getCaseSuccess = (data) =>  ({ type: ActionTypes.GET_CASE_SUCCESS, data })

export const addCaseCategoryAttempt = (data) => ({ type: ActionTypes.ADD_CASE_CATEGORY_ATTEMPT, data })

export const addCaseCategorySuccess = (data) => ({ type: ActionTypes.ADD_CASE_CATEGORY_SUCCESS, data })

export const removeCaseCategoryAttempt = (data) => ({ type: ActionTypes.REMOVE_CASE_CATEGORY_ATTEMPT, data })

export const removeCaseCategorySuccess = (data) => ({ type: ActionTypes.REMOVE_CASE_CATEGORY_SUCCESS, data })

export const addCaseItemAttempt = (data) => ({ type: ActionTypes.ADD_CASE_ITEM_ATTEMPT, data })

export const addCaseItemSuccess = (data) => ({ type: ActionTypes.ADD_CASE_ITEM_SUCCESS, data })

export const removeCaseItemAttempt = (data) => ({ type: ActionTypes.REMOVE_CASE_ITEM_ATTEMPT, data })

export const removeCaseItemSuccess = (data) => ({ type: ActionTypes.REMOVE_CASE_ITEM_SUCCESS, data })

export const updateCaseItemAttempt = (data) => ({ type: ActionTypes.UPDATE_CASE_ITEM_ATTEMPT, data })

export const updateCaseItemSuccess = (data) => ({ type: ActionTypes.UPDATE_CASE_ITEM_SUCCESS, data })

export const updateCaseStatusAttempt = (data) => ({ type: ActionTypes.UPDATE_CASE_STATUS_ATTEMPT, data })

export const updateCaseStatusSuccess = (data) => ({ type: ActionTypes.UPDATE_CASE_STATUS_SUCCESS, data })

export const updateCasePrioritiesAttempt = (data) => ({ type: ActionTypes.UPDATE_CASE_PRIORITIES_ATTEMPT, data })

export const updateCasePrioritiesSuccess = (data) => ({ type: ActionTypes.UPDATE_CASE_PRIORITIES_SUCCESS, data })

export const updateCaseAttempt = (data) => ({ type: ActionTypes.UPDATE_CASE_ATTEMPT, data })

export const updateCaseSuccess = (data) => ({ type: ActionTypes.UPDATE_CASE_SUCCESS, data })

export const getCasePriceAttempt = (data) => ({ type: ActionTypes.GET_CASE_PRICE_ATTEMPT, data })

export const getCasePriceSuccess = (data) => ({ type: ActionTypes.GET_CASE_PRICE_SUCCESS, data })

export const uploadCaseImageAttempt = (data) => ({ type: ActionTypes.UPLOAD_CASE_IMAGE_ATTEMPT, data })

export const uploadCaseImageSuccess = (data) => ({ type: ActionTypes.UPLOAD_CASE_IMAGE_SUCCESS, data })

export const apiAttempt = () => ({ type: ActionTypes.API_ATTEMPT })

export const apiSuccess = () => ({ type: ActionTypes.API_SUCCESS })

export const apiFailed = () => ({ type: ActionTypes.API_FAILED })