import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { find, propEq, equals, pick } from 'ramda';
import { toastr } from 'react-redux-toastr';
import { withStyles, FormLabel, Input } from '@material-ui/core';

import { ITable, IModal, IWarningModal, ISelect } from '../../core/components';
import EditUserForm from '../components/edit-user';
import UserDetail from '../components/user-detail';

import { capitalize } from '../../core/helpers';
import moment from 'moment';
import * as UserActions from '../store/actions';
import { debounce } from "lodash";
import { USER_ROLES } from "../../core/constants";

const userTypes = Object.keys(USER_ROLES).map(key => ({
  key,
  value: USER_ROLES[key]
}));
userTypes.unshift({ key: "ALL", value: "All" });

class Users extends Component {
  state = {
    users: [],
    selectedUserIds: [],
    activeUser: null,
    open: false,
    warningTitle: "",
    warningContent: "",
    activeType: "",
    filterName: "",
    filterEmail: "",
    page: 0,
    dPage: 0,
    rowsPerPage: 8,
    dRowsPerPage: 8,
    sortBy: 'createdAt',
    sortDirection: 'desc',
    dSortBy: 'createdAt',
    dsortDirection: 'desc'    
  };

  componentDidMount() {
    this.props.getUsers({
      limit: this.state.rowsPerPage,
      offset: this.state.page
    });
  }

  componentWillMount() {
    this.debouncedUsersByFilter = debounce(payload => {
      this.props.getUsers({
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
      const newState = {};
      newState.users = nextProps.users.map(user => {
        const newUser = { ...user };
        newUser.type = capitalize(user.type);
        newUser.status = capitalize(user.status);
        newUser.createdAt = moment(user.createdAt).format("lll");
        newUser.updatedAt = moment(user.updatedAt).format("lll");

        if (newUser.balance) {
          newUser.balance = +user.balance.toFixed(2);
        } else {
          newUser.balance = 0;
        }
        if (!user.name) {
          newUser.name = user.username;
        }

        return newUser;
      });

      if (this.state.activeModalType !== 'detail') {
        newState.activeModalType = null;
      }

      this.setState(newState);
    }
  }

  handleOpen = type => {
    this.setState({ activeModalType: type });

    if (type === 'detail') {
      const activeUser = this.getActiveItem();
      this.props.getUserDetail({
        id: activeUser._id,
        offset: 0,
        limit: 8
      });
    }
  };

  handleModalClose = () => {
    this.setState({ activeModalType: null });
  };

  setSelection = selectedItems => {
    this.setState({ selectedUserIds: selectedItems });
  };

  onChangePage = page => {
    this.setState({ page }, this.getUserByFilter());
  };

  onChangeRowsPerPage = rowsPerPage => {
    this.setState({ rowsPerPage, page: 0 }, this.getUserByFilter());
  };

  onhandleRequestSort = sort => {
    this.setState({ sortBy: sort['orderBy'], sortDirection: sort['order'] });
    this.debouncedUsersByFilter();
  };

  onChangeDetailPageSort = sort => {
    const activeUser = this.getActiveItem();
    this.setState({ dSortBy: sort['orderBy'], dSortDirection: sort['order'] });

    this.props.getUserDetail({
      id: activeUser._id,
      offset: this.state.dPage,
      limit: this.state.dRowsPerPage,
      sortBy: sort['orderBy'],
      sortDirection: sort['order']
    });
  };

  onChangeDetailPage = page => {
    const activeUser = this.getActiveItem();

    this.setState({ dPage: page });
    this.props.getUserDetail({
      id: activeUser._id,
      offset: page,
      limit: this.state.dRowsPerPage,
      sortBy: this.state.dSortBy,
      sortDirection: this.state.dSortDirection
    });
  };

  onChangeDetailRowsPerPage = (rowsPerPage, page) => {
    const activeUser = this.getActiveItem();

    this.setState({ dRowsPerPage: rowsPerPage });
    this.props.getUserDetail({
      id: activeUser._id,
      offset: page,
      limit: rowsPerPage,
      sortBy: this.state.dSortBy,
      sortDirection: this.state.dSortDirection
    });
  };

  getActiveItem = () => {
    const { selectedUserIds } = this.state;
    const { users } = this.props;

    return find(propEq("_id", selectedUserIds[0]))(users);
  };

  updateUser = payload => {
    const activeUser = this.getActiveItem();
    const allowedFields = ['_id', 'type', 'username', 'status', 'newBalance', 'email', 'newPassword'];

    if (!equals(activeUser, payload)) {
      allowedFields
        .filter(k => k !== "_id" && activeUser[k] === payload[k])
        .map(k => {
          delete payload[k];
          return true;
        });
      this.props.updateUser(pick(allowedFields, payload));
    } else {
      toastr.error("Error", "No changes were made.");
    }
  };

  disableUsers = () => {
    const { selectedUserIds } = this.state;

    this.props.disableUsers(selectedUserIds);
  };

  onTypeSearch = e => {
    const activeType = e.target.value;
    this.setState({ activeType, page: 0 }, this.getUserByFilter);
  }

  onFilterNameChanged = e => {
    const filterName = e.target.value;
    this.setState({ filterName, page: 0 }, this.getUserByFilter);
  }

  onFilterEmailChanged = e => {
    const filterEmail = e.target.value;
    this.setState({ filterEmail, page: 0 }, this.getUserByFilter);
  }

  getUserByFilter = () => {
    const { activeType, filterName, filterEmail } = this.state;
    let query = {};

    if (activeType !== "ALL" && activeType) {
      query.type = activeType;
    }

    if (filterName) {
      query.name = filterName;
    }

    if (filterEmail) {
      query.userEmail = filterEmail;
    }

    this.debouncedUsersByFilter(query);
  };

  render() {
    const { classes, loading, total, dTotal, detail } = this.props;
    const { users, activeModalType, filterName, filterEmail, activeType, page } = this.state;
    const activeUser = this.getActiveItem();
    const headers = [
      { id: 'name', numeric: false, label: 'Name', width: 200,
        filterComponent: (
          <div>
            <FormLabel component="legend">Name</FormLabel>
            <Input
              name="nameFilter"
              value={filterName}
              onChange={this.onFilterNameChanged}
              required
            />
          </div>
        )
      },
      { id: 'email', numeric: false, label: 'Email',
       filterComponent: (
          <div>
            <FormLabel component="legend">Email</FormLabel>
            <Input
              name="emailFilter"
              value={filterEmail}
              onChange={this.onFilterEmailChanged}
              required
            />
          </div>
        )
      },
      { id: 'type', numeric: false, label: 'Type', width: 100,
        filterComponent: <ISelect
          name="typeFilter"
          label="Type"
          className={classes.selectField}
          variant="outlined"
          options={userTypes}
          value={activeType}
          onChange={this.onTypeSearch}
          required
        />
      },
      { id: 'status', numeric: false, label: 'Status' },
      { id: 'balance', numeric: false, label: 'Balance ($)' },
      { id: 'ip', numeric: false, label: 'IP Address' },
      { id: 'createdAt', numeric: false, label: 'Created' },
      { id: 'updatedAt', numeric: false, label: 'Modified' },
    ];

    return (
      <Fragment>
        <div className={classes.btnAddUserWrapper}></div>
        <div className={classes.root}>
          <ITable
            headers={headers}
            data={users}
            orderBy="name"
            startPage={page}
            rowsPerPage={8}
            setSelection={this.setSelection}
            onEdit={() => this.handleOpen('update')}
            onDisable={() => this.handleOpen('disable')}
            onDetail={() => {this.handleOpen('detail')}}
            loading={loading && !activeModalType}
            onChangeRowsPerPage={this.onChangeRowsPerPage}
            onChangePage={this.onChangePage}
            onhandleRequestSort={this.onhandleRequestSort}
            total={total}
          />
          <IModal
            open={activeModalType === "update"}
            handleClose={this.handleModalClose}
            title="Update User"
            subTitle="Admin update users"
            width={250}
            disableBackdropClick
          >
            <EditUserForm
              loading={loading}
              formType={activeModalType}
              initialValues={activeUser}
              onSubmit={this.updateUser}
              onCancel={this.handleModalClose}
            />
          </IModal>

          <IModal
            open={activeModalType === 'detail'}
            handleClose={this.handleModalClose}
            title="User Detail"
            subTitle="User detail information"
            disableBackdropClick
          >
            <UserDetail
              loading={loading}
              detail={detail}
              total={dTotal}
              formType={activeModalType}
              selected={activeUser}
              onCancel={this.handleModalClose}
              onChangeRowsPerPage={this.onChangeDetailRowsPerPage}
              onhandleRequestSort={this.onChangeDetailPageSort}
              onChangePage={this.onChangeDetailPage}
            />
          </IModal>
          <IWarningModal
            title="Disable Users"
            content="Are you sure to disable selected users?"
            open={activeModalType === "disable"}
            loading={loading}
            onSubmit={this.disableUsers}
            onClose={this.handleModalClose}
          />
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

Users.propTypes = {
  classes: PropTypes.object.isRequired
};

const mapStateToProps = ({ users, auth }) => ({
  users: users.data || [],
  detail: users.detail || [],
  dTotal: users.dTotal || 0,
  total: users.total || 0,
  loading: users.loading,
  info: auth.info
});

const mapDispatchToProps = dispatch => ({
  getUsers: (payload) => dispatch(UserActions.getUsersAttempt(payload)),
  getUserDetail: (payload) => dispatch(UserActions.getUserDetailAttempt(payload)),
  updateUser: (payload) => dispatch(UserActions.editUserAttempt(payload)),
  disableUsers: (userIds) => dispatch(UserActions.disableUsersAttempt(userIds))
})

export default connect(
  mapStateToProps, mapDispatchToProps
)(
  withStyles(styles)(Users)
);
