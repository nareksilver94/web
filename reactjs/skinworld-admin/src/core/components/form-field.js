import React from 'react';
import PropTypes from 'prop-types';
import cn from 'classnames';
import TextField from '@material-ui/core/TextField';
import { withStyles } from '@material-ui/core/styles';

const IFormField = ({
  input,
  label,
  type,
  variant,
  small,
  classes,
  className,
  meta: { touched, error }={},
  ...otherProps
}) => (
  <TextField
    id={label}
    className={cn(classes.input, className, {
      'small': !!small
    })}
    label={label}
    variant={variant}
    type={type}
    error={touched && !!error}
    helperText={touched && error}
    {...input}
    {...otherProps}
  />
)

const styles = theme => ({
    input: {
      '& input': {
        padding: 12
      },
      '& label': {
        transform: 'translate(12px, 15px) scale(1)'
      },

      '&.small': {
        '& input': {
          padding: `${theme.spacing(1)}px ${theme.spacing(2)}px`
        },
        '& div': {
          fontSize: '0.8rem'
        }
      }
    }
  })

IFormField.propTypes = {
  classes: PropTypes.object.isRequired
}

export default withStyles(styles)(IFormField);