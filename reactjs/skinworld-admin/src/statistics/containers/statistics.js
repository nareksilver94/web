import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import {
  withStyles,
  RadioGroup,
  FormControl,
  FormControlLabel,
  Radio
} from '@material-ui/core';
import { ITable } from '../../core/components';
import * as StatisticsActions from '../store/actions';
import { debounce } from 'lodash';
import unknown from '../../assets/unknown.png'


class Statistics extends Component {

  state = {
    statistics: [],
    filterName: '',
    page: 0,
    rowsPerPage: 8,
    total: 0,
    sortBy: 'openingsNum',
    sortDirection: 'desc'
  };

  imgRefs = {}

  componentDidMount() {
    this.props.getStatistics({
      limit: this.state.rowsPerPage,
      offset: this.state.page,
      sortBy: this.state.sortBy,
      sortDirection: this.state.sortDirection
    });
  }

  componentWillMount() {

    this.debouncedStatisticssByFilter = debounce(payload => {
      this.props.getStatistics({
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
      state.statistics = nextProps.statistics.map(statistic => {
        const newStatistics = { ...statistic };

        newStatistics.image = (
          <img
            src={statistic.case.image}
            alt={statistic.case.name}
            ref={ref => this.imgRefs[statistic._id] = ref}
            className={nextProps.classes.image}
            onError={() => { this.imgRefs[statistic._id].src = unknown }}
          />
        );
        newStatistics._id = statistic.caseId;
        newStatistics.case.name = statistic.case.name;
        newStatistics.openingsNum = statistic.openingsNum;
        newStatistics.case.price = statistic.case.price;
        newStatistics.revenue = statistic.revenue;

        return newStatistics;
      });
      
      if (nextProps.users) {
        state.users = nextProps.users;
      }

      const total = nextProps.total;
      state.total = total;
      this.setState(state)      
    }
  }

  handleChange = (e) => {
    
    const filterName = e.target.value;
    
    this.setState({ filterName, page: 0 }, this.getStatisticsByFilter);
  };

  onChangePage = page => {
    this.setState({ page }, this.getStatisticsByFilter());
  };

  onChangeRowsPerPage = rowsPerPage => {
    this.setState({ rowsPerPage, page: 0 }, this.getStatisticsByFilter());
  };

  onhandleRequestSort = sort => {
    this.setState({ sortBy: sort['orderBy'], sortDirection: sort['order'] });
    this.getStatisticsByFilter();
  };

  getStatisticsByFilter = () => {
    const { filterName } = this.state;
    let query = {};

    if(filterName){
      query.search = filterName;
    }

    this.debouncedStatisticssByFilter(query);
  }

  render() {
    const { classes, loading } = this.props;
    const { statistics, total, page } = this.state;

    const headers = [
      { id: "image", numeric: false, label: "", width: 140 },
      { id: "case.name", numeric: false, label: "Name", width: 100 },
      { id: "case.price", numeric: false, label: "Price", width: 100 },
      { id: "openingsNum", numeric: false, label: "Total Count" },
      { id: "revenue", numeric: false, label: "Revenue" },
    ];

    return (
      <Fragment>
        <div className={classes.btnAddUserWrapper}>
          <FormControl component="fieldset">
            <RadioGroup row aria-label="position" name="position" defaultValue="All">
              <FormControlLabel
                value="All"
                control={<Radio color="primary" onChange={this.handleChange} />}
                label="All"
                labelPlacement="end"
              />
              <FormControlLabel
                value="Day"
                control={<Radio color="primary" onChange={this.handleChange} />}
                label="Day"
                labelPlacement="end"
              />
              <FormControlLabel
                value="Week"
                control={<Radio color="primary" onChange={this.handleChange} />}
                label="Week"
                labelPlacement="end"
              />
              <FormControlLabel
                value="Month"
                control={<Radio color="primary" onChange={this.handleChange} />}
                label="Month"
                labelPlacement="end"
              />
              <FormControlLabel
                value="Year"
                control={<Radio color="primary" onChange={this.handleChange} />}
                label="Year"
                labelPlacement="end"
              />              
            </RadioGroup>
          </FormControl> 
        </div>
        <div className={classes.root}>
          <ITable
            headers={headers}
            data={statistics}
            startPage={page}
            orderBy='name'
            rowsPerPage={8}
            loading={loading}
            onChangeRowsPerPage={this.onChangeRowsPerPage}
            onChangePage={this.onChangePage}
            onhandleRequestSort={this.onhandleRequestSort}
            total={total}
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
  image: {
    height: theme.spacing(6),
    marginLeft: theme.spacing(0.5),
    marginTop: theme.spacing(0.5),
    objectFit: 'cover'
  },
  btnAddUser: {
    fontSize: theme.spacing(2)
  }
});

Statistics.propTypes = {
  classes: PropTypes.object.isRequired
};

const mapStateToProps = ({ statistics, auth }) => ({
  statistics: statistics.data || [],
  total: statistics.total || 0,
  loading: statistics.loading,
  info: auth.info
});

const mapDispatchToProps = dispatch => ({
  getStatistics: (payload) => dispatch(StatisticsActions.getStatisticsAttempt(payload))
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(withStyles(styles)(Statistics));
