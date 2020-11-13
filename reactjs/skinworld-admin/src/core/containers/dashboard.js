import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { Route } from 'react-router'
import { withStyles } from '@material-ui/core/styles';

import AppHeader from './app-header';
import AppLeftbar from './app-leftbar';
import BreadCrumb from './breadcrumb';
import { ILayoutCard } from '../components';

import UserRoutes from '../../users/routes';
import CaseRoutes from '../../cases/routes';
import ItemRoutes from '../../items/routes';
import TransactionRoutes from '../../transactions/routes';
import WithdrawalRoutes from '../../withdrawals/routes';
import Ips from '../../ips/routes';
import Statistics from '../../statistics/routes';


class Dashboard extends Component {

    state = {
        mobileOpen: false
    };

    handleDrawerToggle = () => {
        this.setState(state => ({ mobileOpen: !state.mobileOpen }));
    }

    render() {
        const { classes, history, match } = this.props;
        const { mobileOpen } = this.state;

        return (
            <div className={classes.root}>
                <AppHeader 
                    title='Skinworld Admin Dashboard'
                    handleDrawerToggle={this.handleDrawerToggle}
                />
                <main className={classes.content}>
                    <AppLeftbar
                        history={history}
                        mobileOpen={mobileOpen}
                        handleDrawerToggle={this.handleDrawerToggle}
                    />
                    <div className={classes.mainPane}>
                        <BreadCrumb />
                        <ILayoutCard className={classes.routeWrapper}>
                            <Route path={`${match.path}/users`} component={UserRoutes}/>
                            <Route path={`${match.path}/cases`} component={CaseRoutes}/>
                            <Route path={`${match.path}/items`} component={ItemRoutes}/>
                            <Route path={`${match.path}/transactions`} component={TransactionRoutes}/>
                            <Route path={`${match.path}/withdrawals`} component={WithdrawalRoutes}/>
                            <Route path={`${match.path}/ips`} component={Ips}/>
                            <Route path={`${match.path}/statistics`} component={Statistics}/>
                        </ILayoutCard>
                    </div>
                </main>
            </div>
        );
    }
}

const styles = theme => ({
    root: {
        flexGrow: 1,
        zIndex: 1,
        overflow: 'auto',
        position: 'relative',
        display: 'flex',
        width: '100%',
        height: '100%',
        flexDirection: 'column'
    },
    toolbar: theme.mixins.toolbar,
    content: {
        display: 'flex',
        flexGrow: 1,
        backgroundColor: theme.palette.background.default,
        padding: theme.spacing(3),
        overflowY: 'auto'
    },
    mainPane: {
        display: 'flex',
        flex: 1,
        flexDirection: 'column',
        paddingLeft: theme.spacing(4)
    },
    routeWrapper: {
        width: '100%',
        // height: '100%'
    }
});

Dashboard.propTypes = {
    classes: PropTypes.object.isRequired,
    theme: PropTypes.object.isRequired,
};

const mapStateToPropss = ({ auth }) => ({
    info: auth.info
});


export default connect(
    mapStateToPropss,
    null
)(withStyles(styles, { withTheme: true })(Dashboard))