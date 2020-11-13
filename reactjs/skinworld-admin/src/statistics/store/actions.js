import ActionTypes from './types'

export const getStatisticsAttempt = (data) => ({ type: ActionTypes.GET_STATISTICS_ATTEMPT, data })

export const getStatisticsSuccess = (data, total) => ({ type: ActionTypes.GET_STATISTICS_SUCCESS, data, total })

export const apiAttempt = () => ({ type: ActionTypes.API_ATTEMPT })

export const apiSuccess = () => ({ type: ActionTypes.API_SUCCESS })

export const apiFailed = () => ({ type: ActionTypes.API_FAILED })