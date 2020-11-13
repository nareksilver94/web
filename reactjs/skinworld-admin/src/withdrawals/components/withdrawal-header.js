import React, { Component, Fragment } from 'react';
import { connect } from 'react-redux';
import { withStyles, Grid, Typography, Box } from '@material-ui/core'
import { IModal } from '../../core/components';
import cn from 'classnames';
import { Link } from '@material-ui/icons';
import UserDetail from '../../users/components/user-detail';
import * as UserActions from "../../users/store/actions";

/**
 * 
 * @param {Number} type   0: Image title | subtitle (big Title)
 *                        1:       title | subtitle (big Title)
 *                        2:       title | subtitle
 *                        3:       title 
 */
class WithdrawalHeader extends Component {
  
  state = {
    dPage: 0,
    dRowsPerPage: 8,
    sortBy: 'createdAt',
    sortDirection: 'desc'
  };

  handleOpen = type => {
    this.setState({ activeModalType: type });

    if (type === 'detail') {
      this.props.getUserDetail({
        id: this.props._id,
        offset: 0,
        limit: 8
      });
    }
  };

  handleModalClose = () => {
    this.setState({ activeModalType: null });
  };

  onChangeDetailPage = page => {
    this.props.getUserDetail({
      id: this.props._id,
      offset: page,
      limit: this.state.dRowsPerPage,
      sortBy: this.state.dSortBy,
      sortDirection: this.state.dSortDirection      
    });
  };

  onChangeDetailRowsPerPage = (rowsPerPage, page) => {

    this.setState({ dRowsPerPage: rowsPerPage });
    this.props.getUserDetail({
      id: this.props._id,
      offset: page,
      limit: rowsPerPage,
      sortBy: this.state.dSortBy,
      sortDirection: this.state.dSortDirection      
    });
  };

  onChangeDetailPageSort = sort => {
    this.setState({ dSortBy: sort['orderBy'], dSortDirection: sort['order'] });

    this.props.getUserDetail({
      id: this.props._id,
      offset: this.state.dPage,
      limit: this.state.dRowsPerPage,
      sortBy: sort['orderBy'],
      sortDirection: sort['order']
    });
  };

  render() {
    const { classes, loading, className, image, dTotal, detail, type, title, _id, subTitle, link, data = {}, ...rest } = this.props;
    const { activeModalType } = this.state;
    
    return (
      <Box my={3} p={3}>
        <div className={cn(classes.wrapper, className && { className })} {...rest}>
          {(type === 1 || type === 3) && <img src={image} alt={title} className={classes.avatar} />}
          <div className={classes.titleWrapper}>
            {type === 1 && 
              (
                <Fragment>
                  <span 
                    className={classes.title}
                    onClick={() => {this.handleOpen('detail')}}
                  >
                    {title}
                  </span>
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
                      pageType="WITHDRAWALS"
                      selected={this.props._id}
                      onCancel={this.handleModalClose}
                      onChangeRowsPerPage={this.onChangeDetailRowsPerPage}
                      onChangePage={this.onChangeDetailPage}
                      onhandleRequestSort={this.onChangeDetailPageSort}                      
                    />
                  </IModal>
                </Fragment>
              )
            }
            {type === 3 && 
              (
                <span className={`${classes.title} small`}>{title}</span>  
              )
            }

            {type !== 3 &&
              (<div style={{ display: 'inline' }}>
                <span className={classes.divider}>|</span>
                <span className={classes.subTitle}>{subTitle}</span>
              </div>)
            }
            {link &&
              <a href={link}
                target="_blank"
                rel="noopener noreferrer"
                className={classes.link}
              >
                <Link/>
              </a>
            }
          </div>
        </div>
        <Box p={2} mt={2}>
          <Grid container spacing={3}>
            {Object.keys(data).map(key => 
              <Grid key={key} item xs={6}>
                <Typography variant="body2" gutterBottom>
                  {key}&nbsp;&nbsp; : &nbsp;&nbsp;&nbsp;{data[key]}
                </Typography>
              </Grid>  
            )}
          </Grid>
        </Box>
      </Box>
    )
  }
}

const styles = theme => ({
  wrapper: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
  },
  avatar: {
    maxWidth: theme.spacing(9),
    maxHeight: theme.spacing(9),
    marginRight: theme.spacing(2)
  },
  titleWrapper: {
    display: 'flex',
    alignItems: 'center'
  },
  title: {
    fontSize: 24,
    paddingRight: theme.spacing(1),
    color: theme.palette.text.dark,
    cursor: 'pointer',
    '&.small': {
      fontSize: 16,
      cursor: 'default',
    }
  },
  subTitle: {
    fontSize: 12,
    fontWeight: 300,
    paddingLeft: theme.spacing(1)
  },
  divider: {
    fontSize: 20,
    color: theme.palette.custom.lightGreen
  },
  link: {
    color: theme.palette.text.primary,
  },
})

const mapStateToProps = ({ users, auth }) => ({
  detail: users.detail || [],
  dTotal: users.dTotal || 0,
  loading: users.loading,
  info: auth.info
});

const mapDispatchToProps = dispatch => ({
  getUserDetail: (payload) => dispatch(UserActions.getUserDetailAttempt(payload)),
})


export default connect(
  mapStateToProps, mapDispatchToProps
)(
  withStyles(styles)(WithdrawalHeader)
);
