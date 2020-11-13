import React from 'react';
import { withStyles } from '@material-ui/core'


const ILayoutCard = ({ classes, className, children }) => (
  <div className={className ? `${classes.wrapper} ${className}` : classes.wrapper}>
    {children}
  </div>
)

const styles = theme => ({
  wrapper: {
    background: theme.palette.custom.primary.normal,
    boxShadow: '0 10px 10px 0 rgba(217, 221, 230, 0.35)',
    borderRadius: theme.spacing(1)
  }
})

export default withStyles(styles)(ILayoutCard)