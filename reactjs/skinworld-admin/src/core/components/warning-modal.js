import React from 'react';
import PropTypes from 'prop-types';
import { withStyles, Typography } from '@material-ui/core';
import { WarningRounded } from '@material-ui/icons';

import { IButton, IModal } from './index';


const IWarningModal = ({
  classes, title, subTitle="", content, type='warning', open, loading,
  okTitle='Yes', cancelTitle='No', onSubmit, onClose
}) => (
  <IModal
    open={open}
    handleClose={onClose}
    title={title}
    subTitle={subTitle}
  >
    <Typography className={classes.content} variant="subtitle1">
      {type === 'warning' && <WarningRounded className={classes.icon}/>}
      {content}
    </Typography>
    <div className={classes.btnWrapper}>
      <IButton
        variant="default"
        className={classes.btn}
        onClick={onClose}
        disabled={loading}
      >
        {cancelTitle}
      </IButton>
      <IButton
        variant="secondary"
        className={classes.btn}
        loading={loading}
        onClick={onSubmit}
      >
        {okTitle}
      </IButton>
    </div>
  </IModal>
);

const styles = theme => ({
  btnWrapper: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: theme.spacing(4)
  },
  content: {
    display: 'flex',
    alignItems: 'center'
  },
  btn: {
    marginLeft: theme.spacing(1.5)
  },
  icon: {
    fontSize: '3rem',
    marginRight: theme.spacing(1.5),
    color: theme.palette.custom.secondary.dark
  }
});

IWarningModal.propTypes= {
  classes: PropTypes.object.isRequired,
  title: PropTypes.string.isRequired,
  content: PropTypes.string.isRequired,
  subTitle: PropTypes.string,
  type: PropTypes.string,
  okTitle: PropTypes.string,
  cancelTitle: PropTypes.string
};


export default withStyles(styles)(IWarningModal);