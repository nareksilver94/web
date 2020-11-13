import React, { Component } from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import cn from 'classnames';
import { withStyles } from '@material-ui/core/styles';
import { Drawer, List, ListItem, ListItemIcon,
    ListItemText, Hidden } from '@material-ui/core';
import {
  Group, ViewCarousel, AddToPhotos, AttachMoney, AddShoppingCart, Devices, Equalizer
} from '@material-ui/icons';
import { find, propEq } from 'ramda';
import { ILayoutCard } from '../components';
import * as CoreActions from '../store/actions';



const DRAWER_WIDTH = 250;

const leftBarConfig = [
    {
        id: 'users',
        route: '/dashboard/users',
        displayName: 'Users',
        icon: <Group />,
        accessableUserTypes: ['ADMIN']
    },
    {
      id: 'cases',
      route: '/dashboard/cases',
      displayName: 'Cases',
      icon: <ViewCarousel />,
      accessableUserTypes: ['ADMIN']
    },
    {
      id: 'items',
      route: '/dashboard/items',
      displayName: 'Items',
      icon: <AddToPhotos />,
      accessableUserTypes: ['ADMIN']
    },
    {
      id: 'transactions',
      route: '/dashboard/transactions',
      displayName: 'Transactions',
      icon: <AttachMoney />,
      accessableUserTypes: ['ADMIN']
    },
    {
      id: 'withdrawals',
      route: '/dashboard/withdrawals',
      displayName: 'Withdrawals',
      icon: <AddShoppingCart />,
      accessableUserTypes: ['ADMIN']
    },
    {
      id: 'ips',
      route: '/dashboard/ips',
      displayName: 'IPs',
      icon: <Devices />,
      accessableUserTypes: ['ADMIN']
    },
    {
      id: 'statistics',
      route: '/dashboard/statistics',
      displayName: 'Statistics',
      icon: <Equalizer />,
      accessableUserTypes: ['ADMIN']
    }
];


class IDrawer extends Component {

    state = {
        activeItemId: null
    };

    componentDidMount() {
      this.init();
    }

    componentWillReceiveProps(nextProps) {
      this.init(nextProps); 
    }

    init = (props) => {
      const { history } = props || this.props;
      const activeItemId = history.location.pathname.split('/')[2];
      const activeRoute = find(propEq('id', activeItemId))(leftBarConfig);

      if (!activeRoute) {
          return;
      }

      if (this.state.activeItemId !== activeItemId) {
          this.setState({ activeItemId });
          this.props.setBreadCrumbInfo({ title: activeRoute.displayName });
      }
    }

    handleLeftBarClicked = ({ id, route, displayName }) => {
        this.setState({ activeItemId: id });
        this.props.setBreadCrumbInfo({ title: displayName });
        this.props.history.push(route);
    };

    render() {
        const { classes, theme, mobileOpen, handleDrawerToggle, info } = this.props;
        const { activeItemId } = this.state;
        const userType = info && info.type;

        const drawer = (
            <List>
            {leftBarConfig.map(config => (
                (config.accessableUserTypes.indexOf(userType) !== -1) &&
                <ListItem
                    key={`wrapper_${config.id}`}
                    onClick={() => this.handleLeftBarClicked(config)}
                    className={cn(classes.listItem, {
                        active: activeItemId === config.id
                    })}
                >
                    {config.icon &&
                        <ListItemIcon className={classes.listItemIcon}>
                            {config.icon}
                        </ListItemIcon>
                    }
                    <ListItemText primary={config.displayName} />
                </ListItem>

            ))}
            </List>
        );

        return (
          <ILayoutCard className={classes.root}>
              <Hidden mdUp>
              <Drawer
                  variant="temporary"
                  anchor={theme.direction === 'rtl' ? 'right' : 'left'}
                  open={mobileOpen}
                  onClose={handleDrawerToggle}
                  classes={{ paper: classes.drawerPaper }}
              >
                  {drawer}
              </Drawer>
              </Hidden>
              <Hidden smDown implementation="css">
              <Drawer
                  variant="permanent"
                  open
                  classes={{ paper: classes.drawerPaper }}
              >
                  {drawer}
              </Drawer>
              </Hidden>
          </ILayoutCard>
        );
    }
}

const styles = theme => ({
  root: {
    width: DRAWER_WIDTH,

    [theme.breakpoints.down('md')]: {
      display: 'none'
    }
  },
  drawerPaper: {
    width: '100%',
    backgroundColor: 'transparent',
    border: 'none',
    [theme.breakpoints.up('md')]: {
      position: 'relative',
    },
    [theme.breakpoints.down('md')]: {
      backgroundColor: theme.palette.custom.primary.normal
    }
  },
  listItem: {
    color: theme.palette.text.primary,
    paddingLeft: theme.spacing(2),

    '& svg, & div span': {
      color: theme.palette.text.primary,
      fontSize: 14
    },
    '&.active svg, &.active div span': {
      color: theme.palette.text.dark
    },
    '& svg': {
      fontSize: 26
    },
    '& div': {
      paddingLeft: theme.spacing(3)
    },
    '&:hover': {
      cursor: 'pointer'
    }
  },
  listItemIcon: {
    margin: 0
  }
});

IDrawer.propTypes = {
  classes: PropTypes.object.isRequired,
  theme: PropTypes.object.isRequired,
};

const mapStateToProps = ({ auth }) => ({
  info: auth.info
})
  
const mapDispatchToProps = dispatch => ({
    setBreadCrumbInfo: (data) => dispatch(CoreActions.setBreadCrumbInfo(data))
})
  
export default connect(
  mapStateToProps,
  mapDispatchToProps
)(withStyles(styles, { withTheme: true })(IDrawer));
