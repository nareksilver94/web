import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { find, propEq, equals, omit } from 'ramda';
import { toastr } from 'react-redux-toastr';
import { withStyles, } from '@material-ui/core';

import { ITableDetail, ILayoutCard, IButton, IModal } from '../../core/components';
import WithdrawalHeader from '../components/withdrawal-header';
import EditWithdrawalForm from '../components/edit-withdrawal';
import { getProductUrl } from '../../core/helpers';
import * as WithdrawalActions from '../store/actions';
import * as ItemActions from '../../items/store/actions';


const trackingHeaders = [
  { id: 'location', numeric: false, label: 'Location' },
  { id: 'deliveryStatus', numeric: false, label: 'Status' },
  { id: 'checkpointTime', numeric: false, label: 'Timestamp' },
]

class WithdrawalDetail extends Component {

  state = {
    withdrawals: [],
    item: null,
    checkpoints: [],
    shippingAddress: null,
    user: null,
    transaction: null,
    tracking: null,
    status: 'PENDING',
    open: false,
    warningTitle: '',
    warningContent: '' 
  }

  componentDidMount() {
    if (!this.props.withdrawals.length) {
      this.props.getWithdrawals();
    } else {
      this.componentWillReceiveProps(this.props)
    }
  }

  componentWillReceiveProps(nextProps) {
    const { withdrawals, match, loading } = nextProps;
    const id = match.params.id;

    if (!withdrawals.length) {
      return;
    }

    const activeWithdrawal = find(propEq('_id', id))(withdrawals);

    if (activeWithdrawal) {
      let item = activeWithdrawal.item.itemId;
      if (activeWithdrawal.item.details) {
        const info = activeWithdrawal.item.details.variant;
        item = {
          name: item.name,
          image: info.image || item.image,
          type: item.type,
          value: `$ ${info.value}`,
          assetId: info.asin || item.assetId,
          ...info.props
        }
      }

      const user = activeWithdrawal.transaction
        ? activeWithdrawal.transaction.user : null;

      this.setState({
        item,
        checkpoints: activeWithdrawal.tracking
          ? activeWithdrawal.tracking.checkpoints
          : [],
        tracking: activeWithdrawal.tracking,
        transaction: activeWithdrawal.transaction,
        status: activeWithdrawal.status,
        shippingAddress: {
          ...activeWithdrawal.shippingAddress,
          depositedValue: activeWithdrawal.transaction.user.depositedValue
        },
        user
      });
    }

    if (this.props.loading && !loading) {
      this.setState({ open: false })
    }
  }

  handleOpen = () => {
    this.setState({ open: true });
  };

  handleModalClose = () => {
    this.setState({ open: false });
  };

  updateWithdrawal = (payload) => {
    const { status, tracking } = this.state;
    const { match, updateWithdrawal } = this.props;
    const prevPayload = {
      status,
      trackingNumber: tracking ? tracking.trackingNumber: ''
    }

    if (!equals(prevPayload, payload)) {
      payload.id = match.params.id;
      if (prevPayload.trackingNumber) {
        delete payload.trackingNumber;
      }
      updateWithdrawal(payload);
    } else {
      toastr.error('Error', 'No changes were made.');
    }
  }

  render() {
    const { classes, loading } = this.props;
    const { checkpoints, item, user, tracking, shippingAddress, status, open } = this.state;

    let trackingTitle = "Tracking";
    const initialValues = { status };

    if (tracking) {
      trackingTitle = `Tracking (Number: ${tracking.trackingNumber || 'Unknown'})`
      initialValues.trackingNumber = tracking.trackingNumber
    }

    return (
      <Fragment>
        {user && 
          <ILayoutCard className={classes.wrapper}>
            <WithdrawalHeader
              title={user.username}
              _id={user._id}
              type={1}
              subTitle={user.email}
              image={user.profileImageUrl}
              data={shippingAddress}
            />
          </ILayoutCard>
        }
        {item && 
          <ILayoutCard className={classes.wrapper}>
            <WithdrawalHeader
              title={item.name}
              type={3}
              image={item.image}
              link={getProductUrl(item)}
              data={omit(['name', 'image'])(item)}
            />
          </ILayoutCard>
        }
        <ILayoutCard className={classes.wrapper}>
          <div className={classes.tableWrapper}>
            <div className={classes.subTableWrapper}>
              <span className={classes.subTableTitle}>{trackingTitle}</span>
              <IButton
                variant="primary"
                className={classes.btn}
                onClick={this.handleOpen}
                disabled={loading}
              >
                Update Withdrawal
              </IButton>
            </div>
            <ITableDetail
              title={trackingTitle}
              data={checkpoints}
              headers={trackingHeaders}
              orderBy='name'
              rowsPerPage={4}
            />
          </div>
        </ILayoutCard>
        <IModal
          open={open}
          handleClose={this.handleModalClose}
          title="Update Withdrawal"
          subTitle="Admin update withdrawals"
          width={250}
          disableBackdropClick
        >
          <EditWithdrawalForm
            loading={loading}
            initialValues={initialValues}
            onSubmit={this.updateWithdrawal}
            onCancel={this.handleModalClose}
          />
        </IModal>
      </Fragment>
    );
  }

}

const styles = theme => ({
  tableWrapper: {
    display: 'flex',
    justifyContent: 'center',
    flexDirection: 'column',
    padding: theme.spacing(4),
    marginBottom: theme.spacing(4)
  },
  subTableWrapper: {
    display: 'flex',
    justifyContent: 'space-between'
  },
  subTableTitle: {
    color: theme.palette.text.dark,
    fontSize: 20
  },
  itemImage: {
    height: theme.spacing(4.5),
    marginLeft: theme.spacing(0.5),
    marginTop: theme.spacing(0.5),
    objectFit: 'cover'
  },
  userImage: {
    height: theme.spacing(9),
    marginLeft: theme.spacing(0.5),
    marginTop: theme.spacing(0.5),
    objectFit: 'cover'
  },
});

WithdrawalDetail.propTypes = {
  classes: PropTypes.object.isRequired
};

const mapStateToProps = ({ withdrawals, items, auth }) => ({
  withdrawals: withdrawals.data || [],
  items: items.data || [],
  loading: withdrawals.loading,
  info: auth.info
});

const mapDispatchToProps = dispatch => ({
  getWithdrawals: () => dispatch(WithdrawalActions.getWithdrawalsAttempt()),
  getItems: () => dispatch(ItemActions.getItemsAttempt()),
  updateWithdrawal: (payload) => dispatch(WithdrawalActions.editWithdrawalAttempt(payload)),
})

export default connect(
  mapStateToProps, mapDispatchToProps
)(
  withStyles(styles)(WithdrawalDetail)
);
