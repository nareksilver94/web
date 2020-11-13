import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import {
  withStyles,
  FormGroup,
  FormLabel,
  FormControlLabel,
  Checkbox,
  Input
} from '@material-ui/core';
import { debounce } from 'lodash';

import { ITableDetail } from '../../core/components';
import { CASE_TYPES } from '../../core/constants';


const headers = [
  { id: 'user', numeric: false, label: 'User Name' },
  { id: 'balance', numeric: false, label: 'User Balance' },
  { id: 'viewsAll', numeric: false, label: 'Views All' },
  { id: 'viewsCanAfford', numeric: false, label: 'Views Can Afford' },
  { id: 'opensAll', numeric: false, label: 'Opens All' },
  { id: 'opensCanAfford', numeric: false, label: 'Opens Can Afford' }
]
// const CASE_TYPES = invertObj(CASE_TYPES);

class CaseDetail extends Component {

  state = {
    isDisabled: false,
    caseTypes: [],
    statistics: [],
    priorities: {},
    data: {},
    houseEdge: 0,
    price: 0
  }

  componentWillMount() {
    this.debouncedPriorityUpdate = debounce((newPriorities) => {
      this.props.onUpdatePriorities({
        _id: this.props.data._id,
        orders: newPriorities
      });
    }, 500);
    this.debouncedCaseUpdate = debounce((payload) => {
      this.props.onUpdateCase({
        _id: this.props.data._id,
        ...payload
      });
    }, 500);
  }

  componentWillReceiveProps(nextProps) {
    const { data, loading } = nextProps;

    if (this.props.loading && !loading && data) {
      let statistics = [];
      if (data.statistics) {
        statistics = data.statistics.map(st => {
          const item = {};
          if (st.user) {
            item._id = st.user._id;
            item.user = st.user.username;
            item.balance = st.user.balance.toFixed(2);
          }
          if (st.views) {
            item.viewsAll = st.views.all;
            item.viewsCanAfford = st.views.canAfford;
          }
          if (st.opens) {
            item.opensAll = st.opens.all;
            item.opensCanAfford = st.opens.canAfford;
          }
          return item;
        });
      }
      this.setState({
        caseTypes: data.caseTypes || [],
        isDisabled: data.isDisabled,
        priorities: data.orders || {},
        statistics,
        houseEdge: data.houseEdge,
        price: data.price,
        data
      });
    }
  }

  updateCaseStatus = (e) => {
    const payload = {
      id: this.props.data._id,
      isDisabled: e.target.checked
    };
    this.setState({ isDisabled: e.target.checked });
    this.props.onCaseStatusChange(payload);
  }

  updateCaseTypes = (category) => {
    const { onAddCaseCategory, onRemoveCaseCategory, data } = this.props;
    let caseTypes = this.state.caseTypes.slice();
    const index = caseTypes.indexOf(category);
    const updatePayload = {
      caseId: data._id,
      category
    };

    if (index === -1) {
      caseTypes.push(category);
      onAddCaseCategory(updatePayload);
    } else {
      caseTypes.splice(index, 1);
      onRemoveCaseCategory(updatePayload); 
    }

    this.setState({ caseTypes });
  }

  updatePriority = (e, type) => {
    e.persist();
    const newPriorities = {
      ...this.state.priorities,
      [type]: +e.target.value
    };
    if (!e.target.value) {
      delete newPriorities[type];
    }
    this.setState({ priorities: newPriorities });
    this.debouncedPriorityUpdate(newPriorities);
  };

  updateCase = fieldName => e => {
    const { value } = e.target;
    const payload = { [fieldName]: +value };

    this.setState(payload);
    this.debouncedCaseUpdate(payload);
  }

  uploadImageMain = e => {
    const { data, onCaseImageUpload } = this.props;
    const file = e.target.files[0];
    onCaseImageUpload({
      id: data._id,
      file,
      isThumb: false
    })
  }

  uploadImageThumbnail = e => {
    const { data, onCaseImageUpload } = this.props;
    const file = e.target.files[0];
    onCaseImageUpload({
      id: data._id,
      file,
      isThumb: true
    })
  }

  render() {
    const { classes, loading } = this.props;
    const { caseTypes, isDisabled, statistics, priorities, data, houseEdge, price } = this.state;

    return (
      <Fragment>
        <div className={classes.detailWrapper}>
          <div><span className={classes.detailLabel}>Name: </span><span>{data.name}</span></div>
          <div><span className={classes.detailLabel}>Creator: </span><span>{data.creator}</span></div>
          <div><span className={classes.detailLabel}>User Earning: </span><span>$ {data.earning}</span></div>
          <div><span className={classes.detailLabel}>Original Price: </span><span>$ {data.originalPrice}</span></div>
        </div>
        <div className={classes.field3}>
          <FormLabel component="legend">Upload Main Image </FormLabel>
          <Input
            type="file"
            accept="image/*"
            disabled={loading}
            onChange={this.uploadImageMain}
          />
        </div>
        <div className={classes.field3}>
          <FormLabel component="legend">Upload Thumbnail Image </FormLabel>
          <Input
            type="file"
            accept="image/*"
            disabled={loading}
            onChange={this.uploadImageThumbnail}
          />
        </div>
        <div required className={classes.field2}>
          <FormLabel component="legend">House Edge</FormLabel>
          <Input
            type="number"
            inputProps={{ min: "0" }}
            onChange={this.updateCase('houseEdge')}
            value={houseEdge}
            disabled={loading}
          />
        </div>
        <div className={classes.field2}>
          <FormLabel component="legend">Price ($) </FormLabel>
          <Input
            type="number"
            inputProps={{ min: "0" }}
            onChange={this.updateCase('price')}
            value={price}
            disabled={loading}
          />
        </div>
        <div className={classes.field2}>
          <FormLabel component="legend">Disabled</FormLabel>
          <FormControlLabel
            control={
              <Checkbox
                checked={isDisabled}
                onChange={this.updateCaseStatus}
                disabled={loading}
              />
            }
            className={classes.label}
          />
        </div>
        <FormGroup className={classes.formWrapper}>
          <div required className={classes.field1}>
            <FormLabel component="legend">Case Types</FormLabel>
            <FormGroup row>
              {Object.keys(CASE_TYPES).map(type => (
                <FormControlLabel
                  key={type}
                  label={CASE_TYPES[type]}
                  control={
                    <Checkbox
                      checked={caseTypes.indexOf(type) !== -1}
                      onChange={() => this.updateCaseTypes(type)}
                      value={type}
                      disabled={loading}
                    />
                  }
                />
              ))}
            </FormGroup>
          </div>

          <div required className={classes.field1}>
            <FormLabel component="legend">Priority</FormLabel>
            <FormGroup row>
              {caseTypes.map(type => (
                <FormControlLabel
                  key={type}
                  label={CASE_TYPES[type]}
                  labelPlacement="start"
                  control={
                    <Input
                      className={classes.input1}
                      type="number"
                      inputProps={{ min: "0" }}
                      onChange={(e) => this.updatePriority(e, type)}
                      value={priorities[type]}
                      disabled={loading}
                    />
                  }
                />
              ))}
            </FormGroup>
          </div>
        </FormGroup>
        <ITableDetail
          headers={headers}
          data={statistics}
          orderBy='name'
          rowsPerPage={4}
          loading={loading}
        />
      </Fragment>
    );
  }

}

const styles = theme => ({
  formWrapper: {
    flexDirection: 'row'
  },
  detailWrapper: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: 16,
    marginBottom: 16,
    border: '1px solid',
    borderRadius: 8,
    background: '#39b1de',
    color: 'white'
  },
  detailLabel: {
    color: '#abe3ff'
  },
  label: {
    width: '100%',
    display: 'flex',
    justifyContent: 'space-between'
  },
  field1: {
    width: '100%'
  },
  field2: {
    margin: '0 16px',
    width: 100,
    display: 'inline-block'
  },
  field3: {
    width: 200,
    margin: '16px 0',
    display: 'inline-block'
  },
  input1: {
    width: 30,
    margin: 8
  },
  input2: {
    width: 70,
    margin: 8
  }
});

CaseDetail.propTypes = {
  classes: PropTypes.object.isRequired
};

export default withStyles(styles)(CaseDetail);