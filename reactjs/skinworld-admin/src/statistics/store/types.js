import { createTypes } from 'reduxsauce'

export default createTypes(
  `
  GET_STATISTICS_ATTEMPT
  GET_STATISTICS_SUCCESS

  API_ATTEMPT
  API_SUCCESS
  API_FAILED
  `
)