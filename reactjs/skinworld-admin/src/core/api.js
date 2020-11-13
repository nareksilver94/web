import { create } from 'apisauce';
import { prop } from 'ramda';
import { transformId } from './helpers';

const api = create({
  baseURL: process.env.REACT_APP_API_BASE_URL,
  headers: { Accept: 'application/vnd.github.v3+json' }
});

api.addResponseTransform(response => {
  const ok = prop('ok', response);
  const data = prop('data', response);
  const problem = prop('problem', response);

  if (!ok) {
    switch (problem) {
      case 'CLIENT_ERROR':
        response.data = {
            status: 'error',
            ...data,
        };
        break;

      case 'TIMEOUT_ERROR':
        response.status = 408;
        response.data = {
          status: 'error',
          message: 'Network timeout. Please try again.',
          ...data,
        };
        break;

      case 'CONNECTION_ERROR':
        response.status = 503
        response.data = {
          status: 'error',
          message: 'Server not available.',
          ...data,
        };
        break;

      case 'NETWORK_ERROR':
        response.status = 511
        response.data = {
          status: 'error',
          message: 'Network unavailable.',
          ...data,
        };
        break;

      case 'CANCEL_ERROR':
        response.status = 500
        response.data = {
          status: 'error',
          message: 'Request has been cancelled.',
          ...data,
        };
        break;

      default:
        response.status = 500
        response.data = {
          status: 'error',
          message: 'System error.',
          ...data,
        };
    }
  } else {
    if (data.length) {
      response.data = data.map(transformId);
    } else {
      response.data = transformId(data);
    }
  }
});


export const loginUser = (data) =>
  api.post('users/authenticate/email', data);

export const getUsers = (data) => 
  api.get(`users`, data);

export const getUserDetail = ({id, ...data}) => 
  api.get(`users/${id}`, data);

export const createUser = (data) =>
  api.post(`users`, data);
  
export const updateUser = ({ _id, ...data }) =>
  api.put(`users/${_id}`, data);

export const disableUsers = (users) =>
  api.post(`users/deactivate`, { users });

export const createCase = (data) => 
  api.post(`cases`, data);

export const getCase = (id) => 
  api.get(`cases/${id}`);

export const getCases = (data) => 
  api.get(`cases/all`, data);

export const getCasesImages = (data) => 
  api.get(`cases/images`, data);

export const disableCase = (id) => 
  api.delete(`cases/${id}`);

export const enableCase = (id) => 
  api.put(`cases/enable/${id}`);

export const updateCase = ({ _id, ...data }) => 
  api.put(`cases/${_id}`, data);

export const addCaseCategory = (data) =>
  api.post(`cases/add-cat`, data);

export const removeCaseCategory = (data) =>
  api.post(`cases/remove-cat`, data);

export const addCaseItem = (data) =>
  api.post(`cases/add-case-item`, data);

export const removeCaseItem = (data) =>
  api.post(`cases/remove-case-item`, data);

export const updateCaseItem = (data) =>
  api.post(`cases/update-case-item`, data);

export const updateCasePriorities = ({ _id, ...data }) =>
  api.post(`cases/${_id}/orders`, data)

export const getCasePrice = (id) =>
  api.post(`cases/price`, { id })

export const uploadCaseImage = ({ id, file }) => {
  const formData = new FormData();
  formData.set('image', file);

  return api.post(`cases/${id}/image`, formData)
}

export const uploadCaseImageManual = ({ id, file, isThumb }) => {
  const formData = new FormData();
  if(!isThumb){
    formData.set('image', file);
  } else {
    formData.set('thumbnail', file);
  }

  return api.post(`cases/${id}/images-manual`, formData)
}

export const getItems = (data) => 
  api.get(`site-items`, data);

export const createItem = (data) => {
  const formData = new FormData();
  Object.entries(data.data).forEach(([key, value]) =>
    formData.set(key, value)
  )
  return api.post(`site-items`, formData);
}

export const editItem = ({ _id, ...data }) => 
  api.put(`site-items/${_id}`, data);

export const syncItemPrices = () => 
  api.post(`site-items/sync-price`);

export const syncItemDescriptions = () => 
  api.post(`site-items/sync-desc`);

export const uploadItemImage = ({ id, file }) => {
  const formData = new FormData();
  formData.set('image', file);

  return api.post(`site-items/${id}/image`, formData)
}

export const uploadItemImageManual = ({ id, file, isThumb }) => {
  const formData = new FormData();
  if(!isThumb){
    formData.set('image', file);
  } else {
    formData.set('thumbnail', file);
  }

  return api.post(`site-items/${id}/images-manual`, formData)
}

export const getTransactions = (data) => 
  api.get(`transactions`, data);

export const getWithdrawals = (data) => 
  api.get(`withdrawals`, data);

export const updateWithdrawal = ({ id, ...data }) => 
  api.put(`withdrawals/${id}`, data);

export const removeWithdrawals = (data) =>
  api.post(`withdrawals/remove`, data);

export const setTokenHeader = (token) => {
    if (token) {
        api.setHeader('Authorization', `Bearer ${token}`);
    }
}

export const getIps = (data) => 
  api.get(`users/ips`, data);

export const getUsersWithIP = (data) => 
  api.get(`users/ip-users`, data);

export const getStatistics = (data) => 
  api.get(`statistics`, data);
