import React from 'react';
import { compose } from 'redux';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import { Grid } from '@material-ui/core';
import { withStyles } from '@material-ui/core/styles';

import { Unauthenticated } from '../../core/components';
import LoginReduxForm from '../components/login';
import * as AuthActions from '../store/actions';


const LoginPage = ({ login, classes, loading }) => (
  <Grid 
    container
    justify={'center'}
    alignItems={'center'}
    className={classes.loginWrapper}>
    <LoginReduxForm
      loading={loading}
      onSubmit={login}
    />
  </Grid>
)

const styles = () => ({
  loginWrapper: {
    flexGrow: 1,
    height: '100%'
  }
})

LoginPage.propTypes = {
  classes: PropTypes.object.isRequired
}

const mapStateToProps = state => ({
  loading: state.auth.loading
})

const mapDispatchToProps = dispatch => ({
  login: (data) => dispatch(AuthActions.loginUserAttempt(data)),
})

export default compose(
  Unauthenticated,
  connect(
    mapStateToProps,
    mapDispatchToProps
  )
)(withStyles(styles)(LoginPage));