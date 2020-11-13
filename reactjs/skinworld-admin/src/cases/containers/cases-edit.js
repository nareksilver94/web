import React, { Component, Fragment } from "react";
import PropTypes from "prop-types";
import { connect } from "react-redux";
import { withStyles } from "@material-ui/core";
import EditCase from "../components/edit-case";
import CreateCase from "../components/create-case";
import * as ItemActions from "../../items/store/actions";
import * as CaseActions from "../store/actions";
import { CASE_TYPES } from "../../core/constants";

const caseTypes = Object.keys(CASE_TYPES).map(key => ({
  key,
  value: CASE_TYPES[key]
}));
caseTypes.unshift({ key: "ALL", value: "All" });

class CasesEdit extends Component {
  state = {
    cases: [],
    casesImages: [],
    activeCase: null,
    open: false,
    items: [],
    isEdit: true
  };
  imgRefs = {};

  componentDidMount() {
    
    this.props.getCasesImages();
    this.props.getItems({
      limit: 100,
      offset: 0      
    });

    if (this.props.match.params.id === 'new') {
      this.setState({isEdit: false});
    }
    else {
      this.props.getCase(this.props.match.params.id);
      this.setState({isEdit: true});
    }
  }

  componentWillReceiveProps(nextProps) {
    
    if ( (!this.state.isEdit || nextProps.activeCase) && nextProps.items.length && nextProps.casesImages.length ) {

      const state = this.state;

      if (nextProps.activeCase) {
        state.activeCase = {
          ...nextProps.activeCase
        };
      }
      else {
        state.activeCase = {
          items: []
        };
      }
      if (this.props.match.params.id === 'new') {
        state.isEdit = false
        state.activeCase = {
          items: []
        };
      }
      state.casesImages = nextProps.casesImages;
      state.items = nextProps.items;
      this.setState(state);
    }
  
  }

  render() {
    const { classes, updateCase, createCase, addCaseCategory, removeCaseCategory } = this.props;
    const { activeCase, casesImages, items, isEdit } = this.state;

    return (
      <Fragment>
        <div className={classes.btnAddCaseWrapper}></div>
        <div className={classes.root}>
          {!activeCase ? (
            <div>Loading...</div>
          ) : (
            isEdit ? (

              <EditCase
                activeCase={activeCase}
                classes={classes}
                casesImages={casesImages}
                casesItems={items}
                onUpdateCase={updateCase}
                onAddCaseCategory={addCaseCategory}
                onRemoveCaseCategory={removeCaseCategory}
              />
              ) : (

              <CreateCase
                activeCase={activeCase}
                classes={classes}
                casesImages={casesImages}
                casesItems={items}
                onCreateCase={createCase}
                onAddCaseCategory={addCaseCategory}
                onRemoveCaseCategory={removeCaseCategory}
              />
              )
            )
          }
        </div>
      </Fragment>
    );
  }
}

const styles = theme => ({
  root: {
    padding: `0 ${theme.spacing(4)}px`
  },
  btnAddCaseWrapper: {
    paddingTop: `${theme.spacing(4)}px`,
    paddingRight: `${theme.spacing(4)}px`,
    textAlign: "end"
  }
});

CasesEdit.propTypes = {
  classes: PropTypes.object.isRequired
};

const mapStateToProps = ({ items, cases, auth }) => ({
  cases: cases.data || [],
  activeCase: cases.activeCase,
  loading: cases.loading,
  casesImages: cases.images || [],
  items: items.data || [],
  itemsloading: items.loading,
  info: auth.info
});

const mapDispatchToProps = dispatch => ({
  getCase: id => dispatch(CaseActions.getCaseAttempt(id)),
  getCasesImages: payload =>
    dispatch(CaseActions.getCasesImagesAttempt(payload)),
  updateCase: (payload) => dispatch(CaseActions.updateCaseAttempt(payload)),
  createCase: (payload) => dispatch(CaseActions.createCaseAttempt(payload)),
  addCaseCategory: (payload) => dispatch(CaseActions.addCaseCategoryAttempt(payload)),
  removeCaseCategory: (payload) => dispatch(CaseActions.removeCaseCategoryAttempt(payload)),  
  getItems: (payload) => dispatch(ItemActions.getItemsAttempt(payload))
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(withStyles(styles)(CasesEdit));
