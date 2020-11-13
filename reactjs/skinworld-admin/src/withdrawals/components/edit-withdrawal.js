import React from 'react';
import PropTypes from 'prop-types';
import { withStyles } from '@material-ui/core';
import { Field, reduxForm } from 'redux-form';
import { IButton, IFormField, ISelect } from '../../core/components'
import { WITHDRAWAL_STATUSES } from '../../core/constants';

const withdrawalStatuses = Object.keys(WITHDRAWAL_STATUSES).map(key => ({
  key,
  value: WITHDRAWAL_STATUSES[key]
}))


const EditWithdrawalForm = ({ classes, initialValues, handleSubmit, onCancel, loading }) => (
  <form className={classes.container} onSubmit={handleSubmit} noValidate>
    <Field
      name="status"
      label="Status"
      component={ISelect}
      className={`${classes.selectField} ${classes.field}`}
      variant="outlined"
      options={withdrawalStatuses}
      required
    />
    {!initialValues.trackingNumber &&
      <Field
        name="trackingNumber"
        component={IFormField}
        type="text"
        label="Tracking Number"
        className={classes.field}
        variant="outlined"
      />
    }
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
        Update
      </IButton>
    </div>
  </form>
)

const validate = (values, props) => {
  const errors = {};

  if (!values.status) {
    errors.status = 'Required';
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

EditWithdrawalForm.propTypes = {
  classes: PropTypes.object.isRequired,
};

const EditWithdrawalReduxForm = reduxForm({
  form: 'createWithdrawal',
  initialValues: {
    type: 'WITHDRAWAL'
  },
  validate
})(
  withStyles(styles)(EditWithdrawalForm)
);

export default EditWithdrawalReduxForm;