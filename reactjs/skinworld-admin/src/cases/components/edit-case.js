import React, { Fragment } from "react";
import {
  withStyles,
  FormLabel,
  Input,
  TextField,
  FormGroup,
  FormControlLabel,
  Checkbox
} from "@material-ui/core";
import Autocomplete from "@material-ui/lab/Autocomplete";
import PropTypes from "prop-types";
import ImagePicker from "react-image-picker";
import "react-image-picker/dist/index.css";
import MaterialTable from "material-table";
import { debounce } from "lodash";
import { CASE_TYPES } from "../../core/constants";
import * as API from "../../core/api";
import { toastr } from 'react-redux-toastr';

class CaseEdit extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      activeCase: [],
      items: [],
      casesImages: [],
      siteItems: [],
      image: null,
      caseTypes: [],

      itemColumns: [
        { title: "Image", field: "image", editComponent: props => <span /> },
        {
          title: "Name",
          field: "name",
          editComponent: props => (
            <Autocomplete
              id="combo-box-demo"
              disableClearable={true}
              defaultValue={props.rowData.item}
              options={this.state.siteItems}
              getOptionLabel={option => option.name}
              onChange={(event, values) => {
                props.onChange(values);
              }}
              style={{ width: 300 }}
              renderInput={params => (
                <TextField {...params} variant="outlined" />
              )}
            />
          )
        },
        { title: "Odds", field: "odd" },
        { title: "Value", field: "value", editable: "never" }
      ]
    };
  }

  componentDidMount() {
    this.getItems();
  }

  componentWillMount() {

    this.debouncedCaseUpdate = debounce(payload => {
      this.props.onUpdateCase({
        _id: this.props.activeCase._id,
        ...payload
      });
    }, 500);
  }

  onPickCaseImage = image => {
    const activeCase = this.state.activeCase;
    activeCase.image = image.src;
    this.setState({ activeCase, image });
    this.debouncedCaseUpdate({
      image: image.src
    });
  };

  onCaseNameChanged = text => {
    const activeCase = this.state.activeCase;
    activeCase.name = text;
    this.setState({ activeCase });
    this.debouncedCaseUpdate({
      name: text
    });
  };

  onCaseAffiliateChanged = event => {
    const text = event.target.value;

    if (text === '') {
      return false;
    }
    if (/[^0-9]/.test(text)){
      event.preventDefault();
      toastr.error('Error', 'Affiliate cut should be a number.');
      return false;
    }
    if (Number(text) > 3 || Number(text) <= 0) {
      event.preventDefault();
      toastr.error('Error', 'Affiliate cut should be less than 3.');
      return false;
    }

    const activeCase = this.state.activeCase;
    this.setState({ activeCase });
    activeCase.affiliateCut = text;

    this.debouncedCaseUpdate({
      affiliateCut: Number(text)
    });
  };

  updateItems() {
    const items = this.state.items.map(item => ({
      item: item._id,
      odd: Number(item.odd)
    }));
    this.debouncedCaseUpdate({
      items: [items[0]]
    });
  }

  updateCaseTypes = category => {
    const { onAddCaseCategory, onRemoveCaseCategory } = this.props;
    let caseTypes = this.state.caseTypes.slice();
    const index = caseTypes.indexOf(category);
    const updatePayload = {
      caseId: this.state.activeCase._id,
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
  };

  getItems() {
    
    if (!this.props.activeCase && !this.props.casesItems) {
      return;
    }

    const items = this.props.activeCase.items.map(item => {
      const newItem = { ...item };
      newItem.image = item.item ? (
        <img
          src={item.item.image}
          alt={item.item.name}
          className={this.props.classes.itemImage}
        />
      ) : (
        <img
          src={item.image}
          alt={item.name}
          className={this.props.classes.itemImage}
        />
      );

      newItem.name = item.item ? item.item.name : item.name;
      newItem.odd = item.odd;
      newItem.value = item.item ? item.item.value : item.value;

      return newItem;
    });

    const siteItems = this.props.casesItems.map(item => {
      const newItem = { ...item };
      newItem.name = item.name;
      newItem.value = item.value;

      return newItem;
    });

    const activeImage = {
      src: this.props.activeCase.image,
      value: this.props.casesImages.indexOf(this.props.activeCase.image)
    };

    this.setState({
      activeCase: this.props.activeCase,
      image: activeImage,
      items,
      casesImages: this.props.casesImages,
      siteItems: siteItems,
      caseTypes: this.props.activeCase.caseTypes || []
    });

  }

  validateOdd(diff) {
    let totalOdds = this.state.activeCase.items.reduce((a, b) => (a + b.odd), 0)  + diff;
    if (totalOdds > 100) {
      toastr.error('Error', 'Total Odd should be less than 100.');
      return false;
    }
    
    return true;
  }
  render() {
    
    const { classes } = this.props;
    const { activeCase, loading, items, casesImages, caseTypes } = this.state;
    
    return (
      <Fragment>
        <div className={classes.btnAddCaseWrapper}></div>
        <div className={classes.root}>
          <div className={classes.field1}>
            <FormLabel component="legend">Name</FormLabel>
            <Input
              type="text"
              onChange={e => this.onCaseNameChanged(e.target.value)}
              placeholder="Case Name"
              value={activeCase.name}
              disabled={loading}
            />
          </div>
          <div className={classes.field1}>
            <FormLabel component="legend">Types</FormLabel>
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
          <div className={classes.field1}>
            <FormLabel component="legend">Affiliate Cut</FormLabel>
            <Input
              type="text"
              onChange={this.onCaseAffiliateChanged}
              placeholder="Case Affiliate Cut"
              value={activeCase.affiliateCut}
              disabled={loading}
            />
          </div>
          <div className={classes.field1}>
            <FormLabel component="legend">SELECT BOX IMAGE</FormLabel>
            <div className={classes.field2}>
              <ImagePicker
                images={casesImages.map((image, i) => ({
                  src: image,
                  value: i
                }))}
                onPick={this.onPickCaseImage}
              />
            </div>
          </div>
          <div className={classes.field1}>
            <MaterialTable
              title="Items"
              columns={this.state.itemColumns}
              data={items}
              editable={{
                onRowAdd: newData =>
                  new Promise((resolve, reject) => {
                    if (!this.validateOdd(Number(newData.odd))) {
                      reject();
                    } else {
                      const newItemData = newData.name;
                      API.addCaseItem({
                        caseId: this.state.activeCase._id,
                        item: newItemData._id,
                        odd: newData.odd
                      })
                        .then(result => {
                          if (result.status === 200) {
                            this.setState(prevState => {
                              const items = [...prevState.items];
                              newData._id = result.data._id;
                              newData.name = newItemData.name;
                              newData.value = newItemData.value;
                              newData.image = (
                                <img
                                  src={newItemData.image}
                                  alt={newItemData.name}
                                  className={this.props.classes.itemImage}
                                />
                              );
                              newData.item = newItemData;
                              items.push(newData);
                              return { ...prevState, items };
                            });
                            resolve();
                          } else {
                            reject();
                          }
                        })
                        .catch(err => {
                          reject();
                        });

                      }
                  }),
                onRowUpdate: (newData, oldData) => {
                  return new Promise((resolve, reject) => {
                    if (!this.validateOdd(Number(newData.odd) - Number(oldData.odd))) {
                      reject();
                    } else {
                      const newItemData = newData.name;
                      API.updateCaseItem({
                        caseId: this.state.activeCase._id,
                        caseItemId: newData._id,
                        item: typeof(newItemData)==='object'? newItemData._id:newData.item._id,
                        odd: newData.odd
                      })
                        .then(result => {
                          if (result.status === 200) {
                            this.setState(prevState => {
                              const items = [...prevState.items];
                              const index = items.indexOf(oldData);
                              if (newData.name.name) {
                                const newItemData = newData.name;
                                newData._id = newItemData._id;
                                newData.name = newItemData.name;
                                newData.image = (
                                  <img
                                    src={newItemData.image}
                                    alt={newItemData.name}
                                    className={this.props.classes.itemImage}
                                  />
                                );
                                newData.item = newItemData;
                              } else {
                                const newOdd = newData.odd;
                                newData = oldData;
                                newData.odd = newOdd;
                              }
                              items[index] = newData;
                              return { ...prevState, items };
                            });
                            resolve();
                          } else {
                            reject();
                          }
                        })
                        .catch(err => {
                          reject();
                        });
                    }
                  });
                },
                onRowDelete: oldData =>
                  new Promise((resolve, reject) => {
                    API.removeCaseItem({
                      caseId: this.state.activeCase._id,
                      caseItemId: oldData._id
                    })
                      .then(result => {
                        if (result.status === 200) {
                          this.setState(prevState => {
                            const items = [...prevState.items];
                            items.splice(items.indexOf(oldData), 1);
                            return { ...prevState, items };
                          });
                          resolve();
                        } else {
                          reject();
                        }
                      })
                      .catch(err => {
                        reject();
                      });
                  })
              }}
            />
          </div>
        </div>
      </Fragment>
    );
  };
}

const styles = theme => ({
  btnAddCaseWrapper: {
    paddingTop: `${theme.spacing(4)}px`,
    paddingRight: `${theme.spacing(4)}px`,
    textAlign: "end"
  },
  root: {
    padding: `0 ${theme.spacing(4)}px`
  },
  field1: {
    paddingTop: `${theme.spacing(5)}px`
  },
  field2: {
    marginTop: theme.spacing(5.5),
    marginBottom: theme.spacing(2.5),
    maxHeight: theme.spacing(40),
    overflow: "auto",
    textAlign: "center"
  },
  image: {
    height: theme.spacing(5.5),
    marginLeft: theme.spacing(0.5),
    marginRight: theme.spacing(0.5),
    marginTop: theme.spacing(2.5),
    objectFit: "cover"
  },
  itemImage: {
    height: theme.spacing(4.5),
    marginLeft: theme.spacing(0.5),
    marginTop: theme.spacing(0.5),
    objectFit: "cover"
  }
});

CaseEdit.propTypes = {
  classes: PropTypes.object.isRequired
};

export default withStyles(styles)(CaseEdit);