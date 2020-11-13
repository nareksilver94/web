import React from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import { withStyles } from '@material-ui/core';

const BreadCrumb = ({ classes, breadcrumbInfo, actionComponents }) => (
    <div className={classes.wrapper}>
        <span className={classes.title}>{breadcrumbInfo.title}</span>
        {actionComponents &&
            <div>{actionComponents}</div>
        }
    </div>
);

const styles = theme => ({
    wrapper: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        height: theme.spacing(4),
        marginBottom: theme.spacing(3)
    },
    title: {
        fontSize: 24,
        color: theme.palette.text.dark
    }
});

BreadCrumb.propTypes = {
    classes: PropTypes.object.isRequired
};

const mapStateToProps = state => ({
    breadcrumbInfo: state.core.breadcrumb
})

export default connect(
    mapStateToProps,
    null
)(withStyles(styles)(BreadCrumb))