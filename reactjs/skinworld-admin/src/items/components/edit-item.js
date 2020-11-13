import React from 'react';
import PropTypes from 'prop-types';
import { withStyles, Input, FormLabel } from '@material-ui/core';
import { Field, reduxForm } from 'redux-form';
import { IButton, IFormField, ISelect } from '../../core/components'
import { ITEM_TYPES } from '../../core/constants';

const itemTypes = Object.keys(ITEM_TYPES).map(key => ({
  key,
  value: ITEM_TYPES[key]
}))

const EditItemForm = ({ classes, handleSubmit, onImageUpload, onCancel, loading }) => {
  const onMainImageChange = e => {
    onImageUpload(e.target.files[0], false);
  }

  const onThumbnailChange = e => {
    onImageUpload(e.target.files[0], true);
  }

  return (
    <form className={classes.container} onSubmit={handleSubmit} noValidate>
      <Field
        name="type"
        component={ISelect}
        type="text"
        label="Type"
        className={classes.field}
        options={itemTypes}
        variant="outlined"
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
        required
      />      
      <FormLabel component="legend" className={classes.legend}>Upload Main Image</FormLabel>
      <Input
        type="file"
        accept="image/*"
        className={classes.field}
        onChange={onMainImageChange}
      />

      <FormLabel component="legend" className={classes.legend}>Upload Thumbnail Image</FormLabel>
      <Input
        type="file"
        accept="image/*"
        className={classes.field}
        onChange={onThumbnailChange}
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
          Edit
        </IButton>
      </div>
    </form>
  )
}

const validate = (values) => {
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
  legend: {
    textAlign: 'left'
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

EditItemForm.propTypes = {
  classes: PropTypes.object.isRequired,
};

const EditItemReduxForm = reduxForm({
  form: 'editItem',
  validate
})(
  withStyles(styles)(EditItemForm)
);

export default EditItemReduxForm;