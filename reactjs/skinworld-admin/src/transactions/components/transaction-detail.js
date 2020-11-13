import React from 'react';
import PropTypes from 'prop-types';
import { withStyles } from '@material-ui/core';
import { Field } from 'redux-form';
import { IButton, IFormField } from '../../core/components'
import { capitalize } from '../../core/helpers';


const TransactionDetail = ({ classes, formType, handleSubmit, onCancel, loading }) => (
  <form className={classes.container} onSubmit={handleSubmit} noValidate>
    <Field
      name="assetId"
      component={IFormField}
      type="text"
      label="ASIN"
      className={classes.field}
      variant="outlined"
      required
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

TransactionDetail.propTypes = {
  classes: PropTypes.object.isRequired,
};


export default withStyles(styles)(TransactionDetail);