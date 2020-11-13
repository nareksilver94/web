import React from 'react';
import { connect } from 'react-redux';
import { Redirect } from 'react-router-dom';
import { decodeJWT } from '../helpers';

const unauthenticated = (WrappedComponent) => {
  const UnauthenticatedComponent =
    ({ token, ...props }) => {
      try {
        if (!token) {
          throw new Error('Token is missing')
        }
        const tokenDecoded = decodeJWT(token);
    
        // if token is expired
        if (Date.now() - tokenDecoded.exp * 1000 > 0) {
          throw new Error('Token Expired')        
        }
      } catch (err) {
        return <WrappedComponent {...props}/>
      }

      return <Redirect to="/"/>
    }

  const mapStateToProps = ({ auth }) => ({
    token: auth.token
  })

  return connect(
    mapStateToProps,
    null
  )(UnauthenticatedComponent);
}

export default unauthenticated;