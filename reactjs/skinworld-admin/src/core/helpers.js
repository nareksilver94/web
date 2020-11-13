import { pipe, path, split } from 'ramda';

export const validateEmail = email =>
    /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/.test(email); // eslint-disable-line no-useless-escape

export const validatePassword = password =>
    /(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{7,}/.test(password);

export const capitalize = (str = '') => {
    str = str.toLowerCase();
    str = str.charAt(0).toUpperCase() + str.slice(1);
    
    return str;
};

export const transformId = (obj) => {
    if (obj && obj._id) {
        obj.id = obj._id;
        delete obj._id;
    }
    
    return obj;
}

export const trimFields = (payload = {}) => {
    const newPayload = Object.assign({}, payload);

    Object.keys(newPayload).forEach(k => {
        if (typeof newPayload[k] === 'string') {
            newPayload[k] = newPayload[k].trim();
        }
    });

    return newPayload;
}

export const formatNumber = (value) => {
  return value ? +value.toFixed(2) : 0
}

export const decodeJWT = (token) => {
  const base64Url = token.split('.')[1];
  const base64 = base64Url.replace('-', '+').replace('_', '/');
  return JSON.parse(atob(base64));
}

export const getProps = (obj, pathStr) => {
    return pipe(split(/[[\].]/), path)(pathStr)(obj);
}

export const getProductUrl = item => {
  let result = null;

  if (item.type.toUpperCase() === 'STOCKX') {
    result = `https://stockx.com/${item.assetId}`;
  }
  if (item.type.toUpperCase() === 'AMAZON') {
    result = `https://www.amazon.com/dp/${item.assetId}`;
  }

  return result;
}
