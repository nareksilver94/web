import React, { Component, Fragment } from 'react';
import { Block } from '@material-ui/icons';
import { ITableDetail, IWarningModal, IButton } from '../../core/components';
import moment from 'moment';
import PropTypes from 'prop-types';
import { withStyles } from '@material-ui/core';


class IPDetail extends Component {

  state = {
    users: [],
    selectedUserIds: [],
    allUserIds: [],
    showDisableAllUsers: false
  };

  componentWillReceiveProps(nextProps) {
    const { data, loading } = nextProps;

    if (this.props.loading && !loading && data) {
      const state = {};
      let disabledCount = 0;
      state.allUserIds = [];

      state.users = data.map(user => {
        const newUser = { ...user };
        newUser._id = user._id;
        newUser.username = user.username;
        newUser.status = user.status;
        newUser._createdAt = moment(user.createdAt).format("lll");
        newUser.disable = user.status !== 'DISABLED' && (
          <Block onClick={() => this.handleOpen("disable", newUser._id)} />
        );
        state.allUserIds.push(newUser._id);

        if (user.status === 'DISABLED') {
          disabledCount += 1;
        }

        return newUser;
      });

      state.showDisableAllUsers = state.users.length > disabledCount;

      this.setState(state);
    }
  }

  handleOpen = (type, id) => {
    if (id) {
      let activeItem = this.state.users.find(v => v._id === id);
      const selectedUserIds = [activeItem._id];
      this.setState({ selectedUserIds, activeModalType: type });
    }
  };

  handleModalClose = () => {
    this.setState({ activeModalType: null });
  };

  setSelection = selectedItems => {
    this.setState({ selectedUserIds: selectedItems });
  };

  openDisableModal = () => {
    this.setState({ activeModalType: "alldisable" });
  };

  disableAllUsers = () => {
    const { allUserIds } = this.state;
    this.props.disableUsers(allUserIds);
    this.setState({ activeModalType: null });
  };

  disableUsers = () => {
    const { selectedUserIds } = this.state;

    this.props.disableUsers(selectedUserIds);
    this.setState({ activeModalType: null });
  };

  render() {
    const { loading, classes } = this.props;
    const { activeModalType, users, showDisableAllUsers } = this.state;
    const headers = [
      { id: "_id", numeric: false, label: "UserID" },
      { id: "username", numeric: false, label: "User Name" },
      { id: "status", numeric: false, label: "Status" },
      { id: "_createdAt", sortField: 'createdAt', numeric: false, label: "Created" },
      { id: "disable", numeric: false, label: "", width: 50 }
    ];
    return (
      <Fragment>
        {showDisableAllUsers &&
          <div className={classes.btnAddItemWrapper}>
            <IButton
              variant="secondary"
              className={classes.btn}
              onClick={this.openDisableModal}
              disabled={loading}
            >
              Disable All Users
            </IButton>
          </div>
        }
        <IWarningModal
          title="Disable All Users"
          content="Are you sure to disable all users?"
          open={activeModalType === "alldisable"}
          loading={loading}
          onSubmit={this.disableAllUsers}
          onClose={this.handleModalClose}
        />
        <ITableDetail
          headers={headers}
          data={users}
          orderBy="name"
          rowsPerPage={8}
          loading={loading}
        />
        <IWarningModal
          title="Disable User"
          content="Are you sure to disable selected user?"
          open={activeModalType === "disable"}
          loading={loading}
          onSubmit={this.disableUsers}
          onClose={this.handleModalClose}
        />
      </Fragment>
    );
  }
}

const styles = theme => ({
  btnAddItemWrapper: {
    paddingTop: `${theme.spacing(4)}px`,
    paddingRight: `${theme.spacing(4)}px`,
    textAlign: "end"
  },
  btn: {
    marginLeft: `${theme.spacing(2)}px`
  }
});

IPDetail.propTypes = {
  classes: PropTypes.object.isRequired
};

export default withStyles(styles)(IPDetail);