import React, { Fragment } from "react";
import { withStyles, FormLabel, Input, TextField } from "@material-ui/core";
import Autocomplete from "@material-ui/lab/Autocomplete";
import PropTypes from "prop-types";
import ImagePicker from "react-image-picker";
import "react-image-picker/dist/index.css";
import MaterialTable from "material-table";
import { IButton } from "../../core/components";
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
      caseItems: null,

      itemColumns: [
        { title: "Image", field: "image", editComponent: props => <span /> },
        {
          title: "Name",
          field: "name",
          editComponent: props => (
            <Autocomplete
              id="combo-box-demo"
              disableClearable={true}
              value={props.rowData.item}
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

  onPickCaseImage = image => {
    const activeCase = this.state.activeCase;
    activeCase.image = image.src;
    this.setState({ activeCase, image });
  };

  onCaseNameChanged = text => {
    const activeCase = this.state.activeCase;
    activeCase.name = text;
    this.setState({ activeCase });
  };

  updateItems() {
    const caseItems = this.state.items.map(item => ({
      item: item._id,
      odd: Number(item.odd)
    }));
    this.setState({ caseItems });
  }

  onCaseAffiliateChanged = text => {
    const activeCase = this.state.activeCase;
    activeCase.affiliateCut = text;
    this.setState({ activeCase });
  };

  onCreate = e => {
    const payload = {
      name: this.state.activeCase.name,
      items: this.state.caseItems,
      affiliateCut: this.state.activeCase.affiliateCut,
      image: this.state.image.src
    };

    this.props.onCreateCase(payload);
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
      siteItems: siteItems
    });
  }

  validateOdd(diff) {
    let totalOdds = this.state.items.reduce((a, b) => (a + Number(b.odd)), 0)  + diff;
    if (totalOdds > 100) {
      toastr.error('Error', 'Total Odd should be less than 100.');
      return false;
    }
    
    return true;
  }

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
    activeCase.affiliateCut = Number(text);
    this.setState({ activeCase });

  }

  render() {
    const { classes } = this.props;
    const { activeCase, loading, items, casesImages } = this.state;

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
                      setTimeout(() => {
                        resolve();
                        this.setState(prevState => {
                          const items = [...prevState.items];
                          const newItemData = newData.name;
                          newData._id = newItemData._id;
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
                        }, this.updateItems);
                      }, 100);
                    }
                  }),
                onRowUpdate: (newData, oldData) => {
                  return new Promise((resolve, reject) => {
                    if (!this.validateOdd(Number(newData.odd) - Number(oldData.odd))) {
                      reject();
                    } else {                    
                      setTimeout(() => {
                        resolve();
                        if (oldData) {
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
                          }, this.updateItems);
                        }
                      }, 100);
                    }
                  });
                },
                onRowDelete: oldData =>
                  new Promise(resolve => {
                    setTimeout(() => {
                      resolve();
                      this.setState(prevState => {
                        const items = [...prevState.items];
                        items.splice(items.indexOf(oldData), 1);
                        return { ...prevState, items };
                      }, this.updateItems);
                    }, 100);
                  })
              }}
            />
          </div>
          <div className={classes.field3}>
            <IButton
              type="submit"
              variant="primary"
              className={classes.btn}
              onClick={this.onCreate}
              loading={loading}
            >
              Create
            </IButton>
            <IButton
              variant="default"
              className={classes.btn}
              disabled={loading}
            >
              Cancel
            </IButton>
          </div>
        </div>
      </Fragment>
    );
  }
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
    textAlign: "center",
    overflow: "auto"
  },
  field3: {
    display: "flex",
    flexDirection: "row",
    paddingTop: `${theme.spacing(5)}px`,
    paddingBottom: `${theme.spacing(5)}px`,
    justifyContent: "flex-end"
  },
  legend: {
    paddingTop: `${theme.spacing(5)}px`
  },
  btn: {
    marginLeft: theme.spacing(1.5)
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
