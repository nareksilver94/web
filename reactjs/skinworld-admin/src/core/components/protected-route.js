import React from 'react';
import { Redirect, Route } from 'react-router-dom';
import { connect } from 'react-redux';
import { decodeJWT } from '../helpers';
import BadPerm from './bad-perm';


const ProtectedRoute = ({
  component: Component,
  children,
  token,
  info,
  location,
  ...rest
}) => {
  if (token) {
    try {
      const tokenDecoded = decodeJWT(token);
  
      // if token is expired
      if (Date.now() - tokenDecoded.exp * 1000 > 0) {
        throw new Error('Token Expired')        
      }
    } catch (err) {
      return <Redirect to="/login" />
    }

    const userType = info && info.type;

    if (userType === 'ADMIN') {
      return Component
        ? (
          <Route {...rest} component={Component}/>
        ) : (
          <Route {...rest}>
            {children}
          </Route>
        );
    } else {
      return <BadPerm />
    }
  } else {
    return <Redirect to="/login"/>
  }
};

const mapStateToProps = ({ auth: { token, info } }) => ({
  token,
  info
});

export default connect(
  mapStateToProps,
  null
)(ProtectedRoute);