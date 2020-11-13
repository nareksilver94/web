import ActionTypes from './types'

export const getTransactionsAttempt = (data) => ({ type: ActionTypes.GET_TRANSACTIONS_ATTEMPT, data })

export const getTransactionsSuccess = (data, total) => ({ type: ActionTypes.GET_TRANSACTIONS_SUCCESS, data, total })

export const apiAttempt = () => ({ type: ActionTypes.API_ATTEMPT })

export const apiSuccess = () => ({ type: ActionTypes.API_SUCCESS })

export const apiFailed = () => ({ type: ActionTypes.API_FAILED })