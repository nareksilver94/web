import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { withStyles, FormLabel, Input } from '@material-ui/core';
import { Edit, Link } from '@material-ui/icons';
import moment from 'moment';
import { pick, debounce } from 'lodash';

import { ITable, IModal, IWarningModal, IButton, ISelect } from '../../core/components';
import CreateItemAutoForm from '../components/create-item-auto';
import CreateItemManualForm from '../components/create-item-manual';
import EditItemForm from '../components/edit-item';
import { capitalize, getProductUrl } from '../../core/helpers';
import * as ItemActions from '../store/actions';
import unknown from '../../assets/unknown.png'
import { ITEM_TYPES, CREATE_TYPES } from '../../core/constants';

const itemTypes = Object.keys(ITEM_TYPES).map(key => ({
  key,
  value: ITEM_TYPES[key]
}))
itemTypes.unshift({ key: 'ALL', value: 'All' })

const createTypes = Object.keys(CREATE_TYPES).map(key => ({
  key,
  value: CREATE_TYPES[key]
}))

createTypes.unshift({ key: 'Type', value: '' })

class Items extends Component {

  state = {
    items: [],
    selectedItemIds: [],
    activeItem: null,
    createOpen: false,
    createItemOpen: false,
    editOpen: false,
    canDismiss: true,
    warningTitle: '',
    warningContent: '',
    filterName: '',
    page: 0,
    rowsPerPage: 8,
    total: 0,
    activeType: '',
    createActiveType: '',
    sortBy: 'createdAt',
    sortDirection: 'desc'
  }

  imgRefs = {}

  componentDidMount() {
    this.props.getItems({
      limit: this.state.rowsPerPage,
      offset: this.state.page,   
    });
  }

  componentWillMount() {

    this.debouncedItemsByFilter = debounce(payload => {
      this.props.getItems({
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

      const items = nextProps.items.map(item => {
        const newItem = { ...item };
        newItem.type = capitalize(item.type);
        newItem.status = capitalize(item.status);
        newItem.createdAt = moment(item.createdAt).format('lll');
        newItem.updatedAt = moment(item.updatedAt).format('lll');
        newItem.edit = (
          <Edit onClick={() => this.handleOpen('edit', newItem._id)}/>
        )
        newItem.image = (
          <img
            src={item.image}
            alt={item.name}
            ref={ref => this.imgRefs[item._id] = ref}
            className={this.props.classes.userImage}
            onError={() => { this.imgRefs[item._id].src = unknown }}
          />
        );

        const link = getProductUrl(newItem);
        if (link) {
          newItem.link = (
            <a href={link}
              target="_blank"
              rel="noopener noreferrer"
              className={this.props.classes.link}
            >
              <Link/>
            </a>
          );
        }
        if (item.balance) {
          newItem.balance = +item.balance.toFixed(2);
        } else {
          newItem.balance = 0;
        }
        if (!item.name) {
          newItem.name = item.itemname || 'Pending...';
        }

        return newItem;
      });
      const total = nextProps.total;
      this.setState({
        items,
        total,
        createOpen: this.state.createOpen && !this.state.canDismiss,
        createItemOpen: this.state.createItemOpen && !this.state.canDismiss,
        editOpen: this.state.editOpen && !this.state.canDismiss
      });
    }
  }

  handleOpen = (type, id) => {
    if (id) {
      let activeItem = this.state.items.find(v => v._id === id);
      activeItem.type = activeItem.type.toUpperCase();
      this.setState({ activeItem });
    }

    this.setState({ [`${type}Open`]: true });
  };

  handleModalClose = (type) => {
    this.setState({ [`${type}Open`]: false });
  };

  setSelection = (selectedItems) => {
    this.setState({ selectedItemIds: selectedItems });
  }

  onChangePage = page => {
    this.setState({ page }, this.debouncedItemsByFilter());
  };

  onChangeRowsPerPage = rowsPerPage => {
    this.setState({ rowsPerPage, page: 0 }, this.debouncedItemsByFilter());
  };

  onhandleRequestSort = sort => {
    this.setState({ sortBy: sort['orderBy'], sortDirection: sort['order'] });
    this.debouncedItemsByFilter();
  };

  createItem = (data) => {
    this.props.createItem(data);
    this.setState({ canDismiss: true, createItemOpen: false });
  }

  editItem = (data) => {
    const payload = pick(data, ['_id', 'type', 'name', 'tag', 'value'])
    payload.value = payload.value.toString();
    this.props.editItem(payload);
    this.setState({ canDismiss: true });
  }

  uploadItemImage = (file, isThumb) => {
    const { activeItem } = this.state;

    if (activeItem) {
      this.props.uploadItemImage({
        id: activeItem._id,
        file,
        isThumb
      });
      this.setState({ canDismiss: false });
    }
  }

  onTypeSearch = (e) => {
    const activeType = e.target.value;
    this.setState({ activeType }, this.getItemByFilter);
  }

  onCreateTypeSearch = (e) => {
    const createActiveType = e.target.value;
    this.setState({ createActiveType, createItemOpen: true, createOpen: false });
  }

  onFilterNameChanged = (e) => {
    const filterName = e.target.value;
    this.setState({ filterName }, this.getItemByFilter);
  }

  getItemByFilter = () => {
    const { activeType, filterName } = this.state;
    let query = {};

    if(activeType !== 'ALL' && activeType){
      query.type = activeType;
    }

    if(filterName){
      query.search = filterName;
    }

    this.debouncedItemsByFilter(query);
  }

  render() {
    const { classes, loading, syncItemPrices, syncItemDescriptions, filterName } = this.props;
    const { items, createOpen, createItemOpen, editOpen, activeItem, activeType, total, createActiveType } = this.state;
    const headers = [
      { id: 'image', numeric: false, label: '' },
      { id: 'name', numeric: false, label: 'Name', width: 400,
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
      { id: 'link', numeric: false, label: 'Link' },
      { id: 'type', numeric: false, label: 'Type', width: 100,
        filterComponent: <ISelect
          name="typeFilter"
          label="Type"
          className={classes.selectField}
          variant="outlined"
          options={itemTypes}
          value={activeType}
          onChange={this.onTypeSearch}
          required
        />
      },
      { id: 'tag', numeric: false, label: 'Tag' },
      { id: 'value', numeric: false, label: 'Price ($)' },
      { id: 'createdAt', numeric: false, label: 'Created' },
      { id: 'updatedAt', numeric: false, label: 'Modified' },
      { id: 'edit', numeric: false, label: '', width: 50 }
    ]

    return (
      <Fragment>
        <div className={classes.btnAddItemWrapper}>
          <IButton
            variant="secondary"
            className={classes.btn}
            onClick={syncItemPrices}
            disabled={loading}
          >
            Sync Price
          </IButton>
          <IButton
            variant="secondary"
            className={classes.btn}
            onClick={syncItemDescriptions}
            disabled={loading}
          >
            Sync Description
          </IButton>
          <IButton
            variant="primary"
            className={classes.btn}
            onClick={() => this.handleOpen('create')}
            disabled={loading}
          >
            Create
          </IButton>
        </div>
        <div className={classes.root}>
          <ITable
            headers={headers}
            data={items}
            orderBy='name'
            rowsPerPage={8}
            setSelection={this.setSelection}
            loading={loading}
            showCheckbox={false}
            onChangeRowsPerPage={this.onChangeRowsPerPage}
            onChangePage={this.onChangePage}
            onhandleRequestSort={this.onhandleRequestSort}
            total={total}
          />
          <IModal
            open={createOpen}
            handleClose={() => this.handleModalClose('create')}
            title="Create an Item"
            subTitle="Select Create Type"
            width={250}
            disableBackdropClick
          >
            <ISelect
              name="typeFilter"
              label="Type"
              className={classes.selectField}
              variant="outlined"
              options={createTypes}
              value={createActiveType}
              onChange={this.onCreateTypeSearch}
              required
            />
          </IModal>          
          <IModal
            open={createItemOpen}
            handleClose={() => this.handleModalClose('createItem')}
            title="Create an Item"
            subTitle="Admin create items"
            width={250}
            disableBackdropClick
          >
            {createActiveType === "AUTO" ? (
              <CreateItemAutoForm
                loading={loading}
                initialValues={{ type: 'AMAZON' }}
                onSubmit={this.createItem}
                onCancel={() => this.handleModalClose('createItem')}
              />
            ) : 
            (<CreateItemManualForm
              loading={loading}
              initialValues={{ type: 'AMAZON' }}
              onSubmit={this.createItem}
              onCancel={() => this.handleModalClose('createItem')}
            />
            )}
          </IModal>
          <IModal
            open={editOpen}
            handleClose={() => this.handleModalClose('edit')}
            title="Edit an Item"
            subTitle="Admin edit item"
            width={250}
            disableBackdropClick
          >
            <EditItemForm
              loading={loading}
              initialValues={activeItem}
              onImageUpload={this.uploadItemImage}
              onSubmit={this.editItem}
              onCancel={() => this.handleModalClose('edit')}
            />
          </IModal>
          <IWarningModal
            title='Disable Items'
            content='Are you sure to disable selected items?'
            open={false}
            loading={loading}
            onSubmit={this.disableItems}
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
    // width: theme.spacing(4.5,
    height: theme.spacing(4.5),
    marginLeft: theme.spacing(0.5),
    marginTop: theme.spacing(0.5),
    // borderRadius: '50%',
    objectFit: 'cover'
  },
  link: {
    color: theme.palette.text.primary,
  },  
  btn: {
    marginLeft: `${theme.spacing(2)}px`
  },
  btnAddItemWrapper: {
    paddingTop: `${theme.spacing(4)}px`,
    paddingRight: `${theme.spacing(4)}px`,
    textAlign: 'end'
  },
  btnAddItem: {
    fontSize: theme.spacing(2)
  }
});

Items.propTypes = {
  classes: PropTypes.object.isRequired
};

const mapStateToProps = ({ items, auth }) => ({
  items: items.data || [],
  total: items.total || 0,
  loading: items.loading,
  info: auth.info
});

const mapDispatchToProps = dispatch => ({
  getItems: (payload) => dispatch(ItemActions.getItemsAttempt(payload)),
  createItem: (payload) => dispatch(ItemActions.createItemAttempt(payload)),
  editItem: (payload) => dispatch(ItemActions.editItemAttempt(payload)),
  syncItemPrices: () => dispatch(ItemActions.syncItemPrices()),
  syncItemDescriptions: () => dispatch(ItemActions.syncItemDescriptions()),
  uploadItemImage: (payload) => dispatch(ItemActions.uploadItemImageAttempt(payload))
})

export default connect(
  mapStateToProps, mapDispatchToProps
)(
  withStyles(styles)(Items)
);
