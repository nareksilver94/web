import { createTypes } from 'reduxsauce'

export default createTypes(
  `
  SET_TOKEN
  SET_USER

  LOGIN_USER_ATTEMPT
  LOG_OUT

  API_ATTEMPT
  API_SUCCESS
  API_FAILED
  `
)