
import React from 'react';
import { Link } from 'react-router-dom';
import { Field, reduxForm } from 'redux-form';
import PropTypes from 'prop-types';
import { withStyles } from '@material-ui/core/styles';

import { IFormField, IButton } from '../../core/components';
import { validateEmail, validatePassword } from '../../core/helpers';
import logo from '../../assets/icons/user.svg';

const LoginForm = ({ handleSubmit, classes, loading }) => (
  <form className={classes.container} onSubmit={handleSubmit} noValidate>
    <div style={{ marginBottom: 25 }}>
      <img src={logo} alt="logo" className={classes.headerImage} />
    </div>
    <div className={classes.titleWrapper}>
      <span className={classes.title}>Login</span>
    </div>
    <Field
      name="email"
      component={IFormField}
      type="email"
      label="Email"
      className={classes.textField}
      variant="outlined"
    />
    <Field
      name="password"
      component={IFormField}
      type="password"
      label="Password"
      className={classes.textField}
      variant="outlined"
    />
    <IButton
      type="submit"
      variant="primary"
      className={classes.btnLogIn}
      loading={loading}
    >
      LOG IN
    </IButton>
    <div className={classes.footerItemWrapper}>
      <span>Don't have an account? <Link to={`/signup`}>Sign up</Link></span>
    </div>
  </form>
)

const validate = values => {
  const errors = {};

  if (!values.email) {
    errors.email = 'Required';
  } else if (!validateEmail(values.email)) {
    errors.email = 'Invalid email address';
  }
  if (!values.password) {
    errors.password = 'Required';
  } else if (!validatePassword(values.password)) {
    errors.password = '7 charactors, One uppercase, One lowercase, One number';
  }

  return errors;
};

const styles = theme => ({
  container: {
    display: 'flex',
    flexDirection: 'column',
    flexWrap: 'wrap',
    width: theme.spacing(31),
    textAlign: 'center',
    padding: `${theme.spacing(4)}px ${theme.spacing(3)}px`,
    background: theme.palette.common.white,
    boxShadow: `0 ${theme.spacing(1.5)}px ${theme.spacing(2)}px 0 ${theme.palette.primary.main}`
  },
  headerImage: {
    width: theme.spacing(25),
    height: theme.spacing(10),
    margin: theme.spacing(3)
  },
  titleWrapper: {
    marginBottom: '40px'
  },
  title: {
    width: theme.spacing(10.5),
    padding: theme.spacing(1.5),
    fontSize: 24,
    letterSpacing: 1,
    borderBottom: `2px solid ${theme.palette.custom.lightGreen}`
  },
  textField: {
    marginBottom: theme.spacing(2.5),
  },
  btnLogIn: {
    marginBottom: theme.spacing(1.5),
    fontSize: 18
  },
  footerItemWrapper: {
    marginTop: theme.spacing(1.5),
    '& span': {
      fontWeight: 200
    },
    '& a': {
      color: theme.palette.custom.primary.main
    }
  }
});

LoginForm.propTypes = {
  classes: PropTypes.object.isRequired
};

const LoginReduxForm = reduxForm({
  form: 'login',
  validate
})(
  withStyles(styles)(LoginForm)
);

export default LoginReduxForm;