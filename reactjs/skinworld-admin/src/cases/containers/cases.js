import React, { Component, Fragment } from 'react';
import { Redirect } from 'react-router-dom'
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { Link } from 'react-router-dom';
import { find, propEq } from 'ramda';
import { withStyles, Input, FormLabel } from '@material-ui/core';
import { RemoveRedEye } from '@material-ui/icons';
import { debounce } from "lodash";
import moment from 'moment';

import CaseDetail from '../components/case-detail';
import { ITable, IModal, ISelect, IButton } from '../../core/components';
import * as CaseActions from '../store/actions';
import { formatNumber, capitalize } from '../../core/helpers';
import { CASE_TYPES } from '../../core/constants';
import unknown from '../../assets/unknown.png'


const caseTypes = Object.keys(CASE_TYPES).map(key => ({
  key,
  value: CASE_TYPES[key]
}))
caseTypes.unshift({ key: 'ALL', value: 'All' })

class Cases extends Component {

  state = {
    cases: [],
    activeCase: null,
    open: false,
    warningTitle: '',
    warningContent: '',
    activeType: '',
    redirect: false,
    filterName: '',
    page: 0,
    rowsPerPage: 8,
    total: 0,
    sortBy: 'createdAt',
    sortDirection: 'desc'
  }
  imgRefs = {}

  componentDidMount() {
    this.props.getCases({
      limit: this.state.rowsPerPage,
      offset: this.state.page    
    });
  }

  componentWillMount() {

    this.debouncedCasesByFilter = debounce(payload => {
      this.props.getCases({
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

      state.cases = nextProps.cases.map(item => {
        const newCase = { ...item };
        
        newCase.view = (
          <RemoveRedEye onClick={() => this.handleOpen(newCase._id)}/>
        )
        newCase.image = (
          <img
            src={item.image}
            alt={item.name}
            ref={ref => this.imgRefs[item._id] = ref}
            className={nextProps.classes.image}
            onError={() => { this.imgRefs[item._id].src = unknown }}
          />
        );
        newCase.name = (
          <Link
            className={this.props.classes.newCaseId}
            to={`/dashboard/cases/${newCase._id}`}
          >{newCase.name}</Link>
        )        
        newCase.type = item.caseTypes.map(v => capitalize(v)).join(', ');
        newCase.createdAt = moment(item.createdAt).format('lll');
        newCase.updatedAt = moment(item.updatedAt).format('lll');
        newCase.price = formatNumber(newCase.price);
        newCase.earning = formatNumber(newCase.earning);
        newCase.profit = formatNumber(newCase.profit);
        newCase.creator = item.creator
          ? (item.creator.username || item.creator.email)
          : '';
        newCase.status = item.isDisabled ? 'Disabled' : '';

        return newCase;
      });

      
      if (nextProps.activeCase) {
        state.activeCase = {
          ...state.cases.find(v => v._id === nextProps.activeCase._id),
          ...nextProps.activeCase,
        }
      }

      const total = nextProps.total;
      state.total = total;
      this.setState(state)
    }
  }

  handleOpen = (id) => {
    this.setState({ open: true });
    this.props.getCase(id);
    this.props.getCasePrice(id);
  };

  handleModalClose = () => {
    this.setState({ open: false });
  };

  onChangePage = page => {
    this.setState({ page }, this.getCaseByFilter());
  };

  onChangeRowsPerPage = rowsPerPage => {
    this.setState({ rowsPerPage, page: 0 }, this.getCaseByFilter());
  };

  onhandleRequestSort = sort => {
    this.setState({ sortBy: sort['orderBy'], sortDirection: sort['order'] });
    this.debouncedCasesByFilter();
  };

  getActiveItem = () => {
    const { selectedCaseIds } = this.state;
    const { cases } = this.props;

    return find(propEq('_id', selectedCaseIds[0]))(cases);
  }

  onTypeSearch = (e) => {
    const activeType = e.target.value;
    this.setState({ activeType }, this.getCaseByFilter);
  }

  onFilterNameChanged = (e) => {
    const filterName = e.target.value;
    this.setState({ filterName }, this.getCaseByFilter);
  }

  getCaseByFilter = () => {
    const { activeType, filterName } = this.state;
    let query = {};

    if(activeType !== 'ALL' && activeType){
      query.caseType = activeType;
    }

    if(filterName){
      query.name = filterName;
    }

    this.debouncedCasesByFilter(query);
  }

  renderRedirect = () => {
    if (this.state.redirect) {
      return <Redirect to='/dashboard/cases/new' />
    }
  }

  render() {
    const { classes, loading, updateCaseStatus,
      addCaseCategory, removeCaseCategory, updatePriorities, updateCase, uploadCaseImage } = this.props;
    const { cases, activeCase, activeType, open, filterName, total } = this.state;
    const headers = [
      { id: 'view', numeric: false, label: '', width: 50 },
      { id: 'image', numeric: false, label: '' },
      { id: 'name', numeric: false, label: 'Name', width: 250,
        filterComponent: <div>
          <FormLabel component="legend">Name</FormLabel>
          <Input
            name="nameFilter"
            value={filterName}
            onChange={this.onFilterNameChanged}
            required
          />
        </div>
      },
      { id: 'type', numeric: false, label: 'Type', width: 100,
        filterComponent: <ISelect
          name="typeFilter"
          label="Type"
          className={classes.selectField}
          variant="outlined"
          options={caseTypes}
          value={activeType}
          onChange={this.onTypeSearch}
          required
        />
      },
      { id: 'status', numeric: false, label: 'Status' },
      { id: 'profit', numeric: false, label: 'Profit ($)' },
      { id: 'unboxCounts', numeric: false, label: 'Unbox Counts' },
      { id: 'createdAt', numeric: false, label: 'Created' },
      { id: 'updatedAt', numeric: false, label: 'Modified' },
    ];

    return (
      <Fragment>
        <div className={classes.btnAddCaseWrapper}></div>
        <div className={classes.root}>
          <div className={classes.btnAddItemWrapper}>
            {this.renderRedirect()}
            <IButton
              variant="primary"
              className={classes.btn}
              onClick={() => this.setState({redirect: true})}
            >
              Create
            </IButton>            
            <ITable
              headers={headers}
              data={cases}
              orderBy='name'
              rowsPerPage={8}
              loading={loading}
              onChangeRowsPerPage={this.onChangeRowsPerPage}
              onChangePage={this.onChangePage}
              onhandleRequestSort={this.onhandleRequestSort}
              total={total}
            />
          </div>
          <IModal
            open={open}
            handleClose={this.handleModalClose}
            title="Case Detail"
            subTitle="Admin case detail view"
          >
            <CaseDetail
              loading={loading}
              data={activeCase}
              onAddCaseCategory={addCaseCategory}
              onRemoveCaseCategory={removeCaseCategory}
              onCaseStatusChange={updateCaseStatus}
              onUpdatePriorities={updatePriorities}
              onUpdateCase={updateCase}
              onCaseImageUpload={uploadCaseImage}
            />
          </IModal>
        </div>
      </Fragment>
    );
  }

}

const styles = theme => ({
  root: {
    padding: `0 ${theme.spacing(4)}px`,
  },
  btnAddCaseWrapper: {
    paddingTop: `${theme.spacing(4)}px`,
    paddingRight: `${theme.spacing(4)}px`,
    textAlign: 'end'
  },
  btnAddCase: {
    fontSize: theme.spacing(2)
  },
  newCaseId: {
    color: theme.palette.text.primary
  },  
  image: {
    height: theme.spacing(6),
    marginLeft: theme.spacing(0.5),
    marginTop: theme.spacing(0.5),
    objectFit: 'cover'
  },
  btn: {
    marginLeft: `${theme.spacing(2)}px`
  },
  btnAddItemWrapper: {
    paddingTop: `${theme.spacing(4)}px`,
    paddingRight: `${theme.spacing(4)}px`,
    textAlign: 'end'
  }  
});

Cases.propTypes = {
  classes: PropTypes.object.isRequired
};

const mapStateToProps = ({ cases, auth }) => ({
  cases: cases.data || [],
  total: cases.total || 0,
  activeCase: cases.activeCase,
  loading: cases.loading,
  info: auth.info
});

const mapDispatchToProps = dispatch => ({
  getCase: (id) => dispatch(CaseActions.getCaseAttempt(id)),
  getCases: (search) => dispatch(CaseActions.getCasesAttempt(search)),
  addCaseCategory: (payload) => dispatch(CaseActions.addCaseCategoryAttempt(payload)),
  removeCaseCategory: (payload) => dispatch(CaseActions.removeCaseCategoryAttempt(payload)),
  updateCaseStatus: (payload) => dispatch(CaseActions.updateCaseStatusAttempt(payload)),
  updatePriorities: (payload) => dispatch(CaseActions.updateCasePrioritiesAttempt(payload)),
  updateCase: (payload) => dispatch(CaseActions.updateCaseAttempt(payload)),
  getCasePrice: (payload) => dispatch(CaseActions.getCasePriceAttempt(payload)),
  uploadCaseImage: (payload) => dispatch(CaseActions.uploadCaseImageAttempt(payload)),
})

export default connect(
  mapStateToProps, mapDispatchToProps
)(
  withStyles(styles)(Cases)
);