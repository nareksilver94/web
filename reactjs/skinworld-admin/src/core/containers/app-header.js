import React, { Component } from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import { withStyles } from '@material-ui/core/styles';
import { 
  AppBar, Toolbar, Typography, IconButton, Grow, Button,
  Paper, Popper, MenuItem, MenuList, ClickAwayListener
} from '@material-ui/core';
import { Menu, ExitToApp, AccountCircleTwoTone } from '@material-ui/icons';

import { actions as AuthActions } from '../../auth';

class AppHeader extends Component {

    state = {
        dropdownOpen: false,
    };

    handleToggle = () => {
        this.setState(state => ({ dropdownOpen: !state.dropdownOpen }));
    };

    handleClose = event => {
        if (event && this.anchorEl.contains(event.target)) {
            return;
        }

        this.setState({ dropdownOpen: false });
    };

    logout = () => {
        const { logout } = this.props;
    
        this.handleClose();
        logout();
    }

    render() {
        const { classes, info, title, handleDrawerToggle } = this.props;
        const { dropdownOpen } = this.state;

        return (
        <AppBar className={classes.navbar} position="static" elevation={0}>
            <Toolbar>
                <IconButton
                    color="inherit"
                    aria-label="Open drawer"
                    onClick={handleDrawerToggle}
                    className={classes.navIconHide}
                >
                    <Menu />
                </IconButton>
                <Typography
                    style={{ flex: 1 }}
                    type="title"
                    color="inherit"
                >
                    {title}
                </Typography>

                {/* Drop down */}
                <div>
                    <Button
                        buttonRef={ref => this.anchorEl = ref}
                        aria-owns={dropdownOpen ? 'menu-list-grow' : null}
                        aria-haspopup="true"
                        onClick={this.handleToggle}
                    >
                        <AccountCircleTwoTone className={classes.navbarImage}/>
                        <span className={classes.navbarName}>{`${info.username || info.email}`}</span>
                    </Button>
                    <Popper
                        open={dropdownOpen}
                        anchorEl={this.anchorEl}
                        className={classes.dropDownWrapper}
                        transition
                        disablePortal
                    >
                    {({ TransitionProps, placement }) => (
                        <Grow
                        {...TransitionProps}
                        id="menu-list-grow"
                        style={{ transformOrigin: placement === 'bottom' ? 'center top' : 'center bottom' }}
                        >
                            <Paper>
                                <ClickAwayListener onClickAway={this.handleClose}>
                                <MenuList>
                                    <MenuItem onClick={this.logout}>
                                        <ExitToApp className={classes.dropdownItem} />
                                        Logout
                                    </MenuItem>
                                </MenuList>
                                </ClickAwayListener>
                            </Paper>
                        </Grow>
                    )}
                    </Popper>
                </div>
            </Toolbar>
        </AppBar>
        );
    }
}

AppHeader.propTypes = {
    classes: PropTypes.object.isRequired
};

const styles = theme => ({
    root: {
        marginTop: theme.spacing(3),
        width: '100%'
    },
    dropdownItem: {
        marginRight: theme.spacing(1)
    },
    navbar: {
        background: theme.palette.common.white,
        borderBottom: `solid 1px ${theme.palette.custom.lightBlue}`,
        height: theme.spacing(6),    
        [theme.breakpoints.up('md')]: {
            width: '100%',
        },
        [theme.breakpoints.down('md')]: {
            marginLeft: 0,
        },

        '&>div': {
            minHeight: theme.spacing(6)
        }
    },
    navbarName: {
        marginLeft: theme.spacing(2),
        textTransform: 'none'
    },
    navbarImage: {
        width: theme.spacing(4),
        height: theme.spacing(4),
        objectFit: 'cover',
        borderRadius: '50%'
    },
    navIconHide: {
        [theme.breakpoints.up('md')]: {
            display: 'none',
        },
    }
});

const mapStateToProps = state => ({
    info: state.auth.info || {}
});
  
const mapDispatchToProps = dispatch => ({
    logout: () => dispatch(AuthActions.logout())
});

export default connect(
    mapStateToProps,
    mapDispatchToProps
)(withStyles(styles)(AppHeader));