import React from 'react';
import PropTypes from 'prop-types';
import { withStyles, Modal, Typography, Grow } from '@material-ui/core';
import { Close as CloseIcon } from '@material-ui/icons';


const IModal = ({ classes, open, title, width, subTitle, children, handleClose, ...rest }) => (
  <Modal
    aria-labelledby="simple-modal-title"
    aria-describedby="simple-modal-description"
    open={open}
    onClose={handleClose}
    className={classes.modal}
    {...rest}
  >
    <Grow in={open} mountOnEnter unmountOnExit >
      <div style={width ? { width } : {}} className={classes.paper}>
        <div className={classes.titleWrapper}>
          <Typography variant="h6" id="modal-title">
            {title}
            <CloseIcon onClick={handleClose} className={classes.btnClose} />
          </Typography>
          <Typography variant="subtitle1" id="simple-modal-description">
            {subTitle}
          </Typography>
        </div>
        {children}
      </div>
    </Grow>
  </Modal>
)

const styles = theme => ({
    paper: {
        position: 'absolute',
        minWidth: theme.spacing(40),
        maxWidth: theme.spacing(130),
        backgroundColor: theme.palette.background.paper,
        boxShadow: theme.shadows[5],
        padding: theme.spacing(4),
    },
    modal: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflowY: 'scroll'
    },
    titleWrapper: {
        marginBottom: theme.spacing(2.5)
    },
    btnClose: {
        cursor: 'pointer',
        float: 'right',
        width: theme.spacing(2.5),
        marginRight: -theme.spacing(2),
        marginTop: -theme.spacing(2)
    }
});

IModal.propTypes = {
    classes: PropTypes.object.isRequired,
    open: PropTypes.bool.isRequired
};

export default withStyles(styles)(IModal);