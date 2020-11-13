import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { find, propEq } from 'ramda';
import { withStyles, FormLabel, Input } from '@material-ui/core';

import { ITable, IModal, IWarningModal, ISelect } from '../../core/components';
import TransactionDetail from '../components/transaction-detail';
import { capitalize } from '../../core/helpers';
import moment from 'moment';
import * as TransactionActions from '../store/actions';
import { debounce } from "lodash";
import { TRANSACTION_TYPES } from '../../core/constants';

const transactionTypes = Object.keys(TRANSACTION_TYPES).map(key => ({
  key,
  value: TRANSACTION_TYPES[key]
}))
transactionTypes.unshift({ key: 'ALL', value: 'All' })

class Transactions extends Component {

  state = {
    transactions: [],
    selectedTransactionIds: [],
    activeTransaction: null,
    open: false,
    warningTitle: '',
    warningContent: '',
    filterUser: '',
    activeType: '',
    page: 0,
    rowsPerPage: 16,
    total: 0,
    sortBy: 'createdAt',
    sortDirection: 'desc'
  }

  componentDidMount() {
    this.props.getTransactions({
      limit: this.state.rowsPerPage,
      offset: this.state.page   
    });
  }

  componentWillMount() {

    this.debouncedTransactionsByFilter = debounce(payload => {
      this.props.getTransactions({
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
      const transactions = nextProps.transactions.map(transaction => {
        const newTransaction = { ...transaction };
        newTransaction.type = capitalize(transaction.type);
        newTransaction.status = capitalize(transaction.status);
        newTransaction.createdAt = moment(transaction.createdAt).format('lll');
        newTransaction.updatedAt = moment(transaction.updatedAt).format('lll');

        if (transaction.user) {
          newTransaction.user = transaction.user.username || transaction.user.email
        }        
        if (transaction.balance) {
          newTransaction.balance = +transaction.balance.toFixed(2);
        } else {
          newTransaction.balance = 0;
        }
        if (!transaction.name) {
          newTransaction.name = transaction.transactionname;
        }

        return newTransaction;
      });
      
      const total = nextProps.total;
      this.setState({ transactions, activeModalType: null, total });
    }
  }

  handleOpen = (type) => {
    this.setState({ activeModalType: type });
  };

  handleModalClose = () => {
    this.setState({ activeModalType: null });
  };

  setSelection = (selectedTransactions) => {
    this.setState({ selectedTransactionIds: selectedTransactions });
  }
  
  onChangePage = page => {
    this.setState({ page }, this.debouncedTransactionsByFilter());
  };

  onChangeRowsPerPage = rowsPerPage => {
    this.setState({ rowsPerPage, page: 0 }, this.debouncedTransactionsByFilter());
  };

  onhandleRequestSort = sort => {
    this.setState({ sortBy: sort['orderBy'], sortDirection: sort['order'] });
    this.debouncedTransactionsByFilter();
  };

  getActiveTransaction = () => {
    const { selectedTransactionIds } = this.state;
    const { transactions } = this.props;

    return find(propEq('_id', selectedTransactionIds[0]))(transactions);
  }

  onTypeSearch = (e) => {
    const activeType = e.target.value;
    this.setState({ activeType }, this.getTransactionByFilter);
  }

  onFilterNameChanged = (e) => {
    const filterUser = e.target.value;
    this.setState({ filterUser }, this.getTransactionByFilter);
  }

  getTransactionByFilter = () => {
    const { activeType, filterUser } = this.state;
    let query = {};

    if(activeType !== 'ALL' && activeType){
      query.transactionType = activeType;
    }

    if(filterUser){
      query.search = filterUser;
    }

    this.debouncedTransactionsByFilter(query);
  }

  render() {
    const { classes, loading } = this.props;
    const { transactions, activeModalType, activeType, filterUser, total } = this.state;
    const headers = [
      { id: 'user', numeric: false, label: 'User', width: 400,
        filterComponent: <div>
          <FormLabel component="legend">User</FormLabel>
          <Input
            name="nameFilter"
            value={filterUser}
            onChange={this.onFilterNameChanged}
            required
          />
        </div>
      },
      { id: 'transactionType', numeric: false, label: 'Type',
        filterComponent: <ISelect
          name="typeFilter"
          label="Type"
          className={classes.selectField}
          variant="outlined"
          options={transactionTypes}
          value={activeType}
          onChange={this.onTypeSearch}
          required
        />
      },
      { id: 'subType', numeric: false, label: 'Sub Type' },
      { id: 'value', numeric: false, label: 'Amount ($)' },
      { id: 'status', numeric: false, label: 'Status' },
      { id: 'createdAt', numeric: false, label: 'Created' },
    ]

    return (
      <Fragment>
        <div className={classes.btnAddTransactionWrapper}>
        </div>
        <div className={classes.root}>
          <ITable
            headers={headers}
            data={transactions}
            orderBy='name'
            rowsPerPage={16}
            setSelection={this.setSelection}
            // onEdit={() => this.handleOpen('update')}
            loading={loading && !activeModalType}
            onChangeRowsPerPage={this.onChangeRowsPerPage}
            onChangePage={this.onChangePage}
            onhandleRequestSort={this.onhandleRequestSort}
            total={total}
          />
          <IModal
            open={activeModalType === 'update'}
            handleClose={this.handleModalClose}
            title="Update Transaction"
            subTitle="Admin update transactions"
            width={250}
            disableBackdropClick
          >
            <TransactionDetail
              loading={loading}
              formType={activeModalType}
              onSubmit={this.updateTransaction}
              onCancel={this.handleModalClose}
            />
          </IModal>
          <IWarningModal
            title='Disable Transactions'
            content='Are you sure to disable selected transactions?'
            open={activeModalType === 'disable'}
            loading={loading}
            onSubmit={this.disableTransactions}
            onClose={this.handleModalClose}
          />
        </div>
      </Fragment>
    );
  }

}

const styles = theme => ({
  root: {
    padding: `0 ${theme.spacing(4)}px`,
  },
  userImage: {
    // width: theme.spacing(4.5),
    height: theme.spacing(4.5),
    marginLeft: theme.spacing(0.5),
    marginTop: theme.spacing(0.5),
    // borderRadius: '50%',
    objectFit: 'cover'
  },
  btnAddTransactionWrapper: {
    paddingTop: `${theme.spacing(4)}px`,
    paddingRight: `${theme.spacing(4)}px`,
    textAlign: 'end'
  },
  btnAddTransaction: {
    fontSize: theme.spacing(2)
  }
});

Transactions.propTypes = {
  classes: PropTypes.object.isRequired
};

const mapStateToProps = ({ transactions, auth }) => ({
  transactions: transactions.data || [],
  total: transactions.total || 0,
  loading: transactions.loading,
  info: auth.info
});

const mapDispatchToProps = dispatch => ({
  getTransactions: (payload) => dispatch(TransactionActions.getTransactionsAttempt(payload)),
})

export default connect(
  mapStateToProps, mapDispatchToProps
)(
  withStyles(styles)(Transactions)
);