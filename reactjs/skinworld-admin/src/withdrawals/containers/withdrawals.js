import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { Link } from 'react-router-dom';
import { withStyles, FormLabel, Input } from '@material-ui/core';

import { ITable, ISelect, IWarningModal } from '../../core/components';
import { capitalize } from '../../core/helpers';
import moment from 'moment';
import * as WithdrawalActions from '../store/actions';
import { debounce } from 'lodash';
import { WITHDRAWAL_STATUSES } from '../../core/constants';
import unknown from '../../assets/unknown.png'

const withdrawalStatuses = Object.keys(WITHDRAWAL_STATUSES).map(key => ({
  key,
  value: WITHDRAWAL_STATUSES[key]
}));
withdrawalStatuses.unshift({ key: "ALL", value: "All" });

class Withdrawals extends Component {
  
  constructor(props){
    super(props);
    const withdrawalState = localStorage.getItem('withdrawalState');
    const state = withdrawalState ? JSON.parse(localStorage.getItem('state')) : '';

    localStorage.removeItem('withdrawalState');

    this.state = {
      withdrawals: [],
      filterName: state ? state.filterName : '',
      activeStatus: state ? state.activeStatus : '',
      page: state ? state.page : 0,
      rowsPerPage: state ? state.rowsPerPage : 16,
      total: 0,
      sortBy: state ? state.sortBy : 'createdAt',
      sortDirection: state ? state.sortDirection : 'desc',
      selectedWithdrawalsIds: [],
    };
  }

  imgRefs = {}

  componentDidMount() {
    this.props.getWithdrawals({
      limit: this.state.rowsPerPage,
      offset: this.state.page,
      sortBy: this.state.sortBy,
      sortDirection: this.state.sortDirection,
      search: this.state.filterName,
      status: this.state.activeStatus,
    });
  }

  componentWillMount() {   
    this.debouncedWithdrawalByFilter = debounce(payload => {
      this.props.getWithdrawals({
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
      const withdrawals = nextProps.withdrawals.map(withdrawal => {
        const newWithdrawal = { ...withdrawal };
        newWithdrawal._id = withdrawal._id;
        newWithdrawal.image = (
          <Link
            className={this.props.classes.withdrawalId}
            onClick={this.onSaveState}
            to={`/dashboard/withdrawals/${withdrawal._id}`}
          >
          <img
            src={withdrawal.item.itemId.image}
            alt={withdrawal.item.itemId.name}
            className={this.props.classes.userImage}
            ref={ref => this.imgRefs[withdrawal.item.itemId._id] = ref}     
            onError={() => { this.imgRefs[withdrawal.item.itemId._id].src = unknown }}
          />
          </Link>
        );        

        newWithdrawal.type = capitalize(withdrawal.type);
        newWithdrawal.status = capitalize(withdrawal.status);
        newWithdrawal.createdAt = moment(withdrawal.createdAt).format('lll');
        newWithdrawal.sentTimestamp = moment(withdrawal.sentTimestamp).format('lll');
        
        if (withdrawal.transaction && withdrawal.transaction.user) {
          newWithdrawal.user =
            withdrawal.transaction.user.name ||
            withdrawal.transaction.user.email;
        }

        return newWithdrawal;
      });

      const total = nextProps.total;
      this.setState({ withdrawals, activeModalType: null, total });
    }
  }

  handleOpen = type => {
    this.setState({ activeModalType: type });
  };

  handleModalClose = () => {
    this.setState({ activeModalType: null });
  };

  onSaveState = () => {
    localStorage.setItem('withdrawalState', 'withdrawalState');
    localStorage.setItem('state', JSON.stringify(this.state));
  }

  onStatusSearch = e => {
    const activeStatus = e.target.value;
    this.setState({ activeStatus }, this.getWithdrawalByFilter);
  };

  onChangePage = page => {
    this.setState({ page }, this.getWithdrawalByFilter());
  };

  onChangeRowsPerPage = rowsPerPage => {
    this.setState({ rowsPerPage, page: 0 }, this.getWithdrawalByFilter());
  };

  onhandleRequestSort = sort => {
    this.setState({ sortBy: sort['orderBy'], sortDirection: sort['order'] });
    this.getWithdrawalByFilter();
  };

  setSelection = selectedItems => {
    this.setState({ selectedWithdrawalsIds: selectedItems });
  };

  onFilterNameChanged = e => {
    const filterName = e.target.value;
    this.setState({ filterName }, this.getWithdrawalByFilter);
  };

  getWithdrawalByFilter = () => {
    const { activeStatus, filterName } = this.state;
    let query = {};

    if (activeStatus !== "ALL" && activeStatus) {
      query.status = activeStatus;
    }

    if (filterName) {
      query.search = filterName;
    }

    this.debouncedWithdrawalByFilter(query);
  };

  removeWithdrawals = () => {
    const { selectedWithdrawalsIds } = this.state;
    this.props.removeWithdrawals(selectedWithdrawalsIds);
  };

  render() {
    const { classes, loading } = this.props;
    const {
      withdrawals,
      filterName,
      activeStatus,
      total,
      activeModalType,
      page
    } = this.state;
    const headers = [
      { id: "image", numeric: false, label: "" },
      {
        id: "user",
        numeric: false,
        label: "User",
        filterComponent: (
          <div>
            <FormLabel component="legend">User</FormLabel>
            <Input
              name="nameFilter"
              value={filterName}
              onChange={this.onFilterNameChanged}
              required
            />
          </div>
        )
      },
      { id: "withdrawalType", numeric: false, label: "Type" },
      {
        id: "status",
        numeric: false,
        label: "Status",
        width: 100,
        filterComponent: (
          <ISelect
            name="statusFilter"
            label="Status"
            className={classes.selectField}
            variant="outlined"
            options={withdrawalStatuses}
            value={activeStatus}
            onChange={this.onStatusSearch}
            required
          />
        )
      },
      { id: 'sentTimestamp', numeric: false, label: 'Sent' },
      { id: 'createdAt', numeric: false, label: 'Created' },
    ]

    return (
      <Fragment>
        <div className={classes.btnAddWithdrawalWrapper}></div>
        <div className={classes.root}>
          <ITable
            headers={headers}
            loading={loading}
            data={withdrawals}
            orderBy="name"
            setSelection={this.setSelection}
            rowsPerPage={16}
            onChangeRowsPerPage={this.onChangeRowsPerPage}
            onChangePage={this.onChangePage}
            onhandleRequestSort={this.onhandleRequestSort}
            total={total}
            onDelete={() => this.handleOpen("delete")}
            startPage={page}
          />
          <IWarningModal
            title="Remove Withdrawals"
            content="Are you sure to remove selected withdrawals?"
            open={activeModalType === "delete"}
            loading={loading}
            onSubmit={this.removeWithdrawals}
            onClose={this.handleModalClose}
          />
        </div>
      </Fragment>
    );
  }
}

const styles = theme => ({
  root: {
    padding: theme.spacing(4)
  },
  withdrawalId: {
    color: theme.palette.text.primary
  },
  btnAddUserWrapper: {
    paddingTop: `${theme.spacing(4)}px`,
    paddingRight: `${theme.spacing(4)}px`,
    textAlign: "end"
  },
    userImage: {
    // width: theme.spacing(4.5,
    height: theme.spacing(4.5),
    marginLeft: theme.spacing(0.5),
    marginTop: theme.spacing(0.5),
    // borderRadius: '50%',
    objectFit: 'cover'
  }
});

Withdrawals.propTypes = {
  classes: PropTypes.object.isRequired
};

const mapStateToProps = ({ withdrawals, auth }) => ({
  withdrawals: withdrawals.data || [],
  total: withdrawals.total || 0,
  loading: withdrawals.loading,
  info: auth.info
});

const mapDispatchToProps = dispatch => ({
  getWithdrawals: payload =>
    dispatch(WithdrawalActions.getWithdrawalsAttempt(payload)),
  removeWithdrawals: withdrawal =>
    dispatch(WithdrawalActions.removeWithdrawalsAttempt(withdrawal))
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(withStyles(styles)(Withdrawals));
