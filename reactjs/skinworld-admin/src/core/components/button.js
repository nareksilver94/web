import React from 'react';
import PropTypes from 'prop-types';
import { Button, CircularProgress } from '@material-ui/core';
import { withStyles } from '@material-ui/core/styles';

const IButton = ({
  label,
  type,
  variant,
  children,
  classes,
  className,
  loading,
  muiVariant,
  disabled,
  ...otherProps
}) => (
  <Button
    id={label}
    variant={muiVariant}
    type={type || 'button'}
    disabled={loading || disabled}
    className={!muiVariant ? `${classes[`${variant}Btn`]} ${className}` : className}
    {...otherProps}
  >
    {children}
    {loading && <CircularProgress size={24} className={classes.loadingIcon} />}
  </Button>
)

const styles = theme => {
  const {
      palette: {
        primary: {main},
        custom: {
          primary: {
            main: primaryMain,
            dark: primaryDark
          },
          secondary: {
            main: secondaryMain,
            dark: secondaryDark
          }
        }
      }
    } = theme;
  const btnStyle = {
    height: theme.spacing(5),
    fontSize: 15,
    fontWeight: 500,
    letterSpacing: '1px',
    textTransform: 'none'
  };

  return {
    primaryBtn: {
      ...btnStyle,
      color: theme.palette.common.white,
      background: `linear-gradient(to right, ${primaryMain}, ${primaryDark})`,
    },
    secondaryBtn: {
      ...btnStyle,
      color: theme.palette.common.white,
      background: `linear-gradient(to right, ${secondaryMain}, ${secondaryDark})`,
    },
    defaultBtn: {
      ...btnStyle,
      color: theme.palette.common.white,
      background: main,
      '&:hover': {
        opacity: 0.8,
        background: main  
      }
    },
    loadingIcon: {
      color: theme.palette.common.white,
      position: 'absolute',
      top: '50%',
      left: '50%',
      marginTop: -12,
      marginLeft: -12,
    }
  }
}

IButton.propTypes = {
  classes: PropTypes.object.isRequired
}

export default withStyles(styles)(IButton);