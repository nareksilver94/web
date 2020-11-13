import ActionTypes from './types'

export const getUsersAttempt = (data) => ({ type: ActionTypes.GET_USERS_ATTEMPT, data })

export const getUsersSuccess = (data, total) => ({ type: ActionTypes.GET_USERS_SUCCESS, data, total })

export const getUserDetailAttempt = (data) => ({ type: ActionTypes.GET_USER_DETAIL_ATTEMPT, data })

export const getUserDetailSuccess = (data) => ({ type: ActionTypes.GET_USER_DETAIL_SUCCESS, data })

export const editUserAttempt = (data) => ({ type: ActionTypes.EDIT_USER_ATTEMPT, data })

export const editUserSuccess = (data) => ({ type: ActionTypes.EDIT_USER_SUCCESS, data })

export const disableUsersAttempt = (userIds) => ({ type: ActionTypes.DISABLE_USERS_ATTEMPT, userIds })

export const disableUsersSuccess = (userIds) => ({ type: ActionTypes.DISABLE_USERS_SUCCESS, userIds })

export const apiAttempt = () => ({ type: ActionTypes.API_ATTEMPT })

export const apiSuccess = () => ({ type: ActionTypes.API_SUCCESS })

export const apiFailed = () => ({ type: ActionTypes.API_FAILED })