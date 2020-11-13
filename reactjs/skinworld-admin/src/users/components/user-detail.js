import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import { withStyles } from '@material-ui/core';
import { ITable } from '../../core/components';
import moment from 'moment';

class UserDetail extends Component {
  state = {
    detail: [],
    page: 0,
    rowsPerPage: 8,
  }

  componentWillReceiveProps(nextProps) {
    if (this.props.loading && !nextProps.loading && nextProps.detail) {
      const newDetail = nextProps.detail.map(d => ({
        ...d,
        _id: d._id,
        createdAt: moment(d.createdAt).format('lll'),
      }))
      this.setState({ detail: newDetail });
    }
  }

  onChangePage = page => {
    this.setState({ page });
    this.props.onChangePage(page);
  };

  onChangeRowsPerPage = rowsPerPage => {
    this.setState({ rowsPerPage, page: 0 });
    this.props.onChangeRowsPerPage(rowsPerPage, 0);
  };

  onhandleRequestSort = sort => {
    this.props.onhandleRequestSort(sort);
  };

  render() {
    const { loading, total, pageType } = this.props; 
    const { detail, rowsPerPage } = this.state;
    let headers = [];
    if (pageType === "WITHDRAWALS") {
      headers = [
        { id: 'user.username', width: 150, numeric: false, label: 'User Name' },
        { id: 'user.email', numeric: false, label: 'Email' },
        { id: 'user.balance', numeric: false, label: 'Balance' },
        { id: 'user.depositedValue', numeric: false, label: 'Deposited Value' },
        { id: 'case.name', numeric: false, label: 'Case Name' },
        // { id: 'case._id', numeric: false, label: 'ID' },
        { id: 'case.price', numeric: false, label: 'Price' },
        { id: 'createdAt', sortField: 'createdAt', numeric: false, label: 'Created Time' }
      ];      
    } else {
      headers = [
        { id: 'case.name', width: 300, numeric: false, label: 'Name' },
        { id: 'case._id', numeric: false, label: 'ID' },
        { id: 'case.price', numeric: false, label: 'Price' },
        { id: 'createdAt', sortField: 'createdAt', numeric: false, label: 'Created Time' }
      ];      
    }
    const collapseHeaders = [
      { id: 'name', width: 300, numeric: false, label: 'Name' },
      { id: 'assetId', numeric: false, label: 'Asset ID' },
      { id: 'value', sortField: 'createdAt', numeric: false, label: 'Item Price' }
    ]
    return (
      <Fragment>
        <ITable
          headers={headers}
          expheaders={collapseHeaders}
          expfield='items'
          orderBy="name"
          data={detail}
          total={total}
          iscollapse="true"
          rowsPerPage={rowsPerPage}
          loading={loading}
          onChangeRowsPerPage={this.onChangeRowsPerPage}
          onhandleRequestSort={this.onhandleRequestSort}
          onChangePage={this.onChangePage}
        />
      </Fragment>
    )
  }
}
const styles = theme => ( {
  root: {
    padding: `0 ${theme.spacing(4)}px`,
  }
} );

UserDetail.propTypes = {
  classes: PropTypes.object.isRequired
};

export default withStyles(styles)(UserDetail);

