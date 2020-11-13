import { createTypes } from 'reduxsauce'

export default createTypes(
  `
  GET_IPS_ATTEMPT
  GET_IPS_SUCCESS

	GET_USERS_WITH_IP_ATTEMPT
	GET_USERS_WITH_IP_SUCCESS

  API_ATTEMPT
  API_SUCCESS
  API_FAILED
  `
)