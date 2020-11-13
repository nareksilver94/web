import ActionTypes from './types'

export const getWithdrawalsAttempt = (data) => ({ type: ActionTypes.GET_WITHDRAWALS_ATTEMPT, data })

export const getWithdrawalsSuccess = (data, total) => ({ type: ActionTypes.GET_WITHDRAWALS_SUCCESS, data, total })

export const editWithdrawalAttempt = (data) => ({ type: ActionTypes.EDIT_WITHDRAWAL_ATTEMPT, data })

export const editWithdrawalSuccess = (data) => ({ type: ActionTypes.EDIT_WITHDRAWAL_SUCCESS, data })

export const removeWithdrawalsAttempt = (withdrawalIds) => ({ type: ActionTypes.REMOVE_WITHDRAWALS_ATTEMPT, withdrawalIds })

export const removeWithdrawalsSuccess = (withdrawalIds) => ({ type: ActionTypes.REMOVE_WITHDRAWALS_SUCCESS, withdrawalIds })

export const apiAttempt = () => ({ type: ActionTypes.API_ATTEMPT })

export const apiSuccess = () => ({ type: ActionTypes.API_SUCCESS })

export const apiFailed = () => ({ type: ActionTypes.API_FAILED })