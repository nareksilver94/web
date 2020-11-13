import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { withStyles, FormLabel, Input } from '@material-ui/core';
import { RemoveRedEye } from '@material-ui/icons';

import { ITable, IModal } from '../../core/components';
import IPDetail from '../components/ip-detail.js';
import * as IpActions from '../store/actions';
import * as UserActions from '../../users/store/actions';
import { debounce } from 'lodash';

class Ips extends Component {

  state = {
    ips: [],
    selectedUserIds: [],
    open: false,
    filterIP: '',
    users: [],
    page: 0,
    rowsPerPage: 8,
    total: 0,
    sortBy: 'ip',
    sortDirection: 'desc'
  };

  componentDidMount() {
    this.props.getIps({
      limit: this.state.rowsPerPage,
      offset: this.state.page 
    });
  }

  componentWillMount() {

    this.debouncedIPsByFilter = debounce(payload => {
      this.props.getIps({
        ...payload,
        limit: this.state.rowsPerPage,
        offset: this.state.page,
        sortBy: this.state.sortBy,
        sortDirection: this.state.sortDirection
      });
    }, 500);
  }

  componentWillReceiveProps(nextProps) {
    if (this.props.loading && !nextProps.loading) {
      const state = {};
      state.ips = nextProps.ips.map(ip => {
        const newIp = { ...ip };
        newIp.view = <RemoveRedEye onClick={() => this.handleOpen(newIp.ip)} />;
        newIp._id = ip.ip;
        newIp.ip = ip.ip;
        newIp.count = ip.count;

        return newIp;
      });
      
      if (nextProps.users) {
        state.users = nextProps.users;
      }

      const total = nextProps.total;
      state.total = total;
      this.setState(state)      
    }
  }

  handleOpen = id => {
    this.setState({ open: true });
    const payload = { ip: id };
    this.props.getUsersWithIP(payload);
  };

  handleModalClose = () => {
    this.setState({ open: false });
  };

  onChangePage = page => {
    this.setState({ page }, this.debouncedIPsByFilter());
  };

  onChangeRowsPerPage = rowsPerPage => {
    this.setState({ rowsPerPage, page: 0 }, this.debouncedIPsByFilter());
  };

  onhandleRequestSort = sort => {
    this.setState({ sortBy: sort['orderBy'], sortDirection: sort['order'] });
    this.debouncedIPsByFilter();
  };

  onFilterIPChanged = e => {
    const filterIP = e.target.value;
    this.setState({ filterIP, page: 0 }, this.getIpByFilter);
  }
  
  getIpByFilter = () => {
    const { filterIP } = this.state;
    let query = {};

    if (filterIP) {
      query.search = filterIP;
    }

    this.debouncedIPsByFilter(query);
  };

  render() {
    const { classes, loading, disableUsers } = this.props;
    const { ips, open, users, total, filterIP, page } = this.state;

    const headers = [
      { id: "view", numeric: false, label: "", width: 50 },
      { id: "ip", numeric: false, label: "IP Address" },
      { id: "count", numeric: false, label: "User Count" }
    ];

    return (
      <Fragment>
        <div className={classes.btnAddUserWrapper}>
          <FormLabel component="legend">IP</FormLabel>
          <Input
            name="IPFilter"
            value={filterIP}
            onChange={this.onFilterIPChanged}
            required
          />

        </div>
        <div className={classes.root}>
          <ITable
            headers={headers}
            startPage={page}
            data={ips}
            orderBy='name'
            rowsPerPage={8}
            loading={loading}
            onChangeRowsPerPage={this.onChangeRowsPerPage}
            onChangePage={this.onChangePage}
            onhandleRequestSort={this.onhandleRequestSort}
            total={total}
          />          
          <IModal
            open={open}
            handleClose={this.handleModalClose}
            title="IP Detail"
          >
            <IPDetail
              data={users}
              disableUsers={disableUsers}
              loading={loading}
            />
          </IModal>
        </div>
      </Fragment>
    );
  }

}

const styles = theme => ({
  root: {
    padding: `0 ${theme.spacing(4)}px`
  },
  btnAddUserWrapper: {
    paddingTop: `${theme.spacing(4)}px`,
    paddingRight: `${theme.spacing(4)}px`,
    textAlign: "end"
  },
  btnAddUser: {
    fontSize: theme.spacing(2)
  }
});

Ips.propTypes = {
  classes: PropTypes.object.isRequired
};

const mapStateToProps = ({ ips, auth }) => ({
  ips: ips.data || [],
  total: ips.total || 0,
  users: ips.users || [],
  loading: ips.loading,
  info: auth.info
});

const mapDispatchToProps = dispatch => ({
  getIps: (payload) => dispatch(IpActions.getIpsAttempt(payload)),
  getUsersWithIP: payload => dispatch(IpActions.getUsersWithIPAttempt(payload)),
  disableUsers: userIds => dispatch(UserActions.disableUsersAttempt(userIds))
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(withStyles(styles)(Ips));
