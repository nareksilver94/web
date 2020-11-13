import { createTypes } from 'reduxsauce'

export default createTypes(
  `
  GET_TRANSACTIONS_ATTEMPT
  GET_TRANSACTIONS_SUCCESS

  API_ATTEMPT
  API_SUCCESS
  API_FAILED
  `
)