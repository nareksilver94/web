import React from 'react';
import PropTypes from 'prop-types';
import { withStyles, FormLabel } from '@material-ui/core';
import { Field, reduxForm } from 'redux-form';
import { IButton, IFormField, ISelect, IFileField } from '../../core/components'
import { ITEM_TYPES } from '../../core/constants';

const itemTypes = Object.keys(ITEM_TYPES).map(key => ({
  key,
  value: ITEM_TYPES[key]
}))


const CreateItemManualForm = ({ classes, handleSubmit, onCancel, loading }) => {

  return (
    <form className={classes.container} onSubmit={handleSubmit} noValidate>
      <Field
        name="type"
        label="Type"
        component={ISelect}
        className={`${classes.selectField} ${classes.field}`}
        variant="outlined"
        options={itemTypes}
        required
      />
      <Field
        name="name"
        component={IFormField}
        type="text"
        label="Name"
        className={classes.field}
        variant="outlined"
        required
      />  
      <Field
        name="assetId"
        component={IFormField}
        type="text"
        label="Asset Id"
        className={classes.field}
        variant="outlined"
        required
      />
      <Field
        name="tag"
        component={IFormField}
        type="text"
        label="Tag"
        className={classes.field}
        variant="outlined"
        required
      />
      <Field
        name="value"
        component={IFormField}
        type="text"
        label="Price"
        className={classes.field}
        variant="outlined"
      />  
      <FormLabel component="legend" className={classes.legend}>Upload Main Image</FormLabel>
      <Field
        name="image"
        component={IFileField}
        type="file"
        className={classes.field}
        variant="outlined"
      />  
      <FormLabel component="legend" className={classes.legend}>Upload Thumbnail Image</FormLabel>
      <Field
        name="thumbnail"
        component={IFileField}
        type="file"
        className={classes.field}
        variant="outlined"
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
          Create
        </IButton>
      </div>
    </form>
  )
}

const validate = (values, props) => {
  const errors = {};

  if (!values.assetId) {
    errors.assetId = 'Required';
  } else if (values.assetId.trim() === '') {
    errors.assetId = 'Invalid';
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
  legend: {
    paddingBottom: `${theme.spacing(1)}px`,
    textAlign: 'left'
  },  
  btn: {
    marginLeft: theme.spacing(1.5)
  }
});

CreateItemManualForm.propTypes = {
  classes: PropTypes.object.isRequired,
};

const CreateItemReduxForm = reduxForm({
  form: 'createItem',
  initialValues: {
    type: 'AMAZON'
  },
  validate
})(
  withStyles(styles)(CreateItemManualForm)
);

export default CreateItemReduxForm;
