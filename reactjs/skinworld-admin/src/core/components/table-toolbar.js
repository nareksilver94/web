import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { lighten } from '@material-ui/core/styles/colorManipulator';
import {
  Delete as DeleteIcon,
  Edit as EditIcon,
  Block as BlockIcon,
  RemoveRedEye as RemoveRedEyeIcon
} from '@material-ui/icons';
import {
  withStyles, Toolbar, Typography, Tooltip, IconButton
} from '@material-ui/core';

const ITableToolbar = props => {
  const { numSelected, classes, title, onDelete, onEdit, onDisable, onDetail } = props;

  return (
    <Toolbar className={classes.root}>
      <div className={classes.title}>
        {numSelected > 0 ? (
          <Fragment>
            {onEdit &&
              (<Tooltip title="Edit">
                <IconButton aria-label="Edit" onClick={onEdit} disabled={numSelected !== 1}>
                  <EditIcon />
                </IconButton>
              </Tooltip>)
            }
            {onDetail &&
              (<Tooltip title="Detail">
                <IconButton aria-label="Detail" onClick={onDetail} disabled={numSelected !== 1}>
                  <RemoveRedEyeIcon />
                </IconButton>
              </Tooltip>)
            }            
            {onDelete &&
              (<Tooltip title="Delete">
                <IconButton aria-label="Delete" onClick={onDelete}>
                  <DeleteIcon />
                </IconButton>
              </Tooltip>)
            }
            {onDisable &&
              (<Tooltip title="Disable">
                <IconButton aria-label="Disable" onClick={onDisable}>
                  <BlockIcon />
                </IconButton>
              </Tooltip>)
            }
          </Fragment>
        ) : (
          <Typography variant="h6" id="tabTitle">
            {title}
          </Typography>
        )}
      </div>
    </Toolbar>
  );
};

const toolbarStyles = theme => ({
  root: {
    position: 'absolute',
    zIndex: 1000,
    display: 'flex',
    flexDirection: 'column',
    padding: theme.spacing(2),
    height: `calc(100% - ${theme.spacing(18)}px)`,
    right: 0,
    top: theme.spacing(7),
    backgroundColor: lighten(theme.palette.secondary.light, 0.85),
    borderLeft: '1px solid',
    marginLeft: 16

  },
  highlight:
    theme.palette.type === 'light'
      ? {
          color: theme.palette.secondary.main,
          backgroundColor: lighten(theme.palette.secondary.light, 0.85),
        }
      : {
          color: theme.palette.text.primary,
          backgroundColor: theme.palette.secondary.dark,
        },
  spacer: {
    flex: '1 1 100%',
  },
  actions: {
    minWidth: theme.spacing(20),
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'flex-end',
    color: theme.palette.text.secondary
  },
  title: {
    flex: '0 0 auto',
    width: theme.spacing(6)
  },
});

ITableToolbar.propTypes = {
  classes: PropTypes.object.isRequired,
  numSelected: PropTypes.number.isRequired,
  onDelete: PropTypes.func,
  onEdit: PropTypes.func,
  onDetail: PropTypes.func
};

export default withStyles(toolbarStyles)(ITableToolbar);