import React from 'react';
import PropTypes from 'prop-types';
import { withStyles } from '@material-ui/core';
import { Field, reduxForm } from 'redux-form';
import { IButton, IFormField, ISelect } from '../../core/components'
import { validateEmail, validatePassword } from '../../core/helpers';
import { USER_ROLES, USER_STATUSES } from '../../core/constants';
import { capitalize } from '../../core/helpers';

const userTypes = Object.keys(USER_ROLES).map(key => ({
  key,
  value: USER_ROLES[key]
}))
const userStatuses = Object.keys(USER_STATUSES).map(key => ({
  key,
  value: USER_STATUSES[key]
}))


const EditUserForm = ({ classes, formType, showTypeField, handleSubmit, onCancel, loading }) => (
  <form className={classes.container} onSubmit={handleSubmit} noValidate>
    <Field
      name="type"
      label="Type"
      component={ISelect}
      className={`${classes.selectField} ${classes.field}`}
      variant="outlined"
      options={userTypes}
      required
    />
    <Field
      name="status"
      label="Status"
      component={ISelect}
      className={`${classes.selectField} ${classes.field}`}
      variant="outlined"
      options={userStatuses}
      required
    />
    <Field
      name="username"
      component={IFormField}
      type="text"
      label="Username"
      className={classes.field}
      variant="outlined"
      required
    />
    <Field
      name="email"
      component={IFormField}
      type="email"
      label="Email"
      className={classes.field}
      variant="outlined"
      required
    />
    <Field
      name="newBalance"
      component={IFormField}
      type="number"
      label="Additional Balance"
      className={classes.field}
      variant="outlined"
      required
    />
    <Field
      name="newPassword"
      component={IFormField}
      type="password"
      label="New Password"
      className={classes.field}
      variant="outlined"
      required={formType === 'create'}
    />
    <div className={classes.btnWrapper}>
      <IButton
        variant="default"
        className={classes.btn}
        onClick={onCancel}
        disabled={loading}
      >
        Cancel
      </IButton>
      <IButton
        type="submit"      
        variant="primary"
        className={classes.btn}
        loading={loading}
      >
        {formType ? capitalize(formType) : ''}
      </IButton>
    </div>
  </form>
)

const validate = (values, props) => {
  const errors = {};

  if (!values.type && props.showTypeField) {
    errors.type = 'Required';
  }

  if (!values.firstName) {
    errors.firstName = 'Required';
  } else if (values.firstName.trim() === '') {
    errors.firstName = 'Invalid';
  }

  if (!values.lastName) {
    errors.lastName = 'Required';
  } else if (values.lastName.trim() === '') {
    errors.lastName = 'Invalid';
  }

  if (!values.email) {
    errors.email = 'Required';
  } else if (!validateEmail(values.email)) {
    errors.email = 'Invalid email address';
  }

  if (props.formType === 'create' && !values.password) {
    errors.password = 'Required';
  }
  if (values.password && !validatePassword(values.password)) {
    errors.password = '8 charactors, One uppercase, One lowercase, One number';
  }

  return errors;
}

const styles = theme => ({
  container: {
    display: 'flex',
    flexDirection: 'column',
    flexWrap: 'wrap',
    textAlign: 'center',
  },
  field: {
    marginBottom: theme.spacing(2.5),
  },
  selectField: {
    width: '50%',
    textAlign: 'start'
  },
  btnWrapper: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'flex-end'
  },
  btn: {
    marginLeft: theme.spacing(1.5)
  }
});

EditUserForm.propTypes = {
  classes: PropTypes.object.isRequired,
};

const CreateUserReduxForm = reduxForm({
  form: 'createUser',
  initialValues: {
    type: 'USER'
  },
  validate
})(
  withStyles(styles)(EditUserForm)
);

export default CreateUserReduxForm;