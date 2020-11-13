import ActionTypes from './types'

export const setToken = (token) => ({ type: ActionTypes.SET_TOKEN, token })

export const setUserInfo = (info) => ({ type: ActionTypes.SET_USER, info })

export const loginUserAttempt = (data) => ({ type: ActionTypes.LOGIN_USER_ATTEMPT, data })

export const logout = () => ({ type: ActionTypes.LOG_OUT })

export const apiAttempt = () => ({ type: ActionTypes.API_ATTEMPT })

export const apiSuccess = () => ({ type: ActionTypes.API_SUCCESS })

export const apiFailed = () => ({ type: ActionTypes.API_FAILED })
