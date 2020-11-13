import ActionTypes from './types'

export const getIpsAttempt = (data) => ({ type: ActionTypes.GET_IPS_ATTEMPT, data })

export const getIpsSuccess = (data, total) => ({ type: ActionTypes.GET_IPS_SUCCESS, data, total })

export const getUsersWithIPAttempt = (data) => ({ type: ActionTypes.GET_USERS_WITH_IP_ATTEMPT, data })

export const getUsersWithIPSuccess = (data) => ({ type: ActionTypes.GET_USERS_WITH_IP_SUCCESS, data })

export const apiAttempt = () => ({ type: ActionTypes.API_ATTEMPT })

export const apiSuccess = () => ({ type: ActionTypes.API_SUCCESS })

export const apiFailed = () => ({ type: ActionTypes.API_FAILED })