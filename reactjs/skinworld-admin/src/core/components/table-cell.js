import React from 'react';
import { TableCell, withStyles } from '@material-ui/core';


const ITableCell = ({ value, classes, ...rest }) =>
  typeof value === 'number' ? 
    (<TableCell align='right' className={classes.cell} {...rest}>{value}</TableCell>) :
    (<TableCell component="th" scope="row" className={classes.cell} {...rest}>{value}</TableCell>)

const styles = theme => ({
  cell: {
    fontSize: '0.9rem',
    padding: theme.spacing(0.5)
  }
});


export default withStyles(styles)(ITableCell)