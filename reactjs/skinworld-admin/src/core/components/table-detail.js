import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { withStyles } from '@material-ui/core/styles';
import { Table, TableBody, TableCell, TablePagination,
  TableRow, Paper, Checkbox, CircularProgress } from '@material-ui/core';
import { ErrorOutline } from '@material-ui/icons';
import { propEq, find } from 'ramda';

import ITableHead from './table-head';
import ITableToolbar from './table-toolbar';
import ITableCell from './table-cell';


const stableSort = (array, cmp) =>
    array.map((el, index) => [el, index])
        .sort((a, b) => {
            const order = cmp(a[0], b[0]);
            if (order !== 0) return order;
            return a[1] - b[1];
        })
        .map(el => el[0]);

const getSorting = (order, orderBy, headers) => {
  const header = headers.find(v => v.id === orderBy);
  let sortField = orderBy;
  if (header && header.sortField) {
    sortField = header.sortField;
  }

  return order === 'desc'
    ? (a, b) => desc(a, b, sortField)
    : (a, b) => -desc(a, b, sortField);
}

const desc = (a, b, orderBy) => {
  if (typeof b[orderBy] === 'number' && typeof a[orderBy] === 'number') {
    if (b[orderBy] < a[orderBy]) {
      return -1;
    }
    if (b[orderBy] > a[orderBy]) {
      return 1;
    }
    return 0;
  } else if (typeof b[orderBy] === 'string' && typeof a[orderBy] === 'string') {
    const compareResult = b[orderBy].localeCompare(a[orderBy]);
    if (compareResult < 0) {
      return -1;
    }
    if (compareResult > 0) {
      return 1;
    }
    return 0;
  }
}


class ITable extends Component {
  
  constructor(props) {
    super(props);

    const { orderBy, rowsPerPage } = props;

    this.state = {
      order: 'asc',
      orderBy: orderBy,
      selected: [],
      headers: [],
      data: [],
      page: 0,
      rowsPerPage: rowsPerPage || 5,
    };
  }

  componentWillReceiveProps(nextProps) {
    const { data, headers } = nextProps;
    const newState = { data, headers };

    if (data.length !== this.props.data.length) {
      newState.selected = this.state.selected.filter(id => {
        return !!find(propEq('_id', id), data)
      })
    }

    this.setState(newState)
  }

  handleRequestSort = (event, property) => {
    const orderBy = property;
    let order = 'desc';

    if (this.state.orderBy === property && this.state.order === 'desc') {
      order = 'asc';
    }

    this.setState({ order, orderBy });
  };

  handleSelectAllClick = event => {
    let selected = [];

    if (event.target.checked) {
      selected = this.state.data.map(n => n._id);
    }
    
    this.setState({ selected });
    this.props.setSelection(selected);

  };

  handleClick = (event, id) => {
    const { onDelete, onEdit } = this.props;
    const isCheckboxEnabled = onDelete || onEdit;

    if (!isCheckboxEnabled) {
      return;
    }

    const { selected } = this.state;
    const selectedIndex = selected.indexOf(id);
    let newSelected = [];

    if (selectedIndex === -1) {
      newSelected = newSelected.concat(selected, id);
    } else if (selectedIndex === 0) {
      newSelected = newSelected.concat(selected.slice(1));
    } else if (selectedIndex === selected.length - 1) {
      newSelected = newSelected.concat(selected.slice(0, -1));
    } else if (selectedIndex > 0) {
      newSelected = newSelected.concat(
        selected.slice(0, selectedIndex),
        selected.slice(selectedIndex + 1),
      );
    }

    this.setState({ selected: newSelected });
    if (this.props.setSelection) {
      this.props.setSelection(newSelected);
    }
  };

  handleChangePage = (event, page) => {
    this.setState({ page });
  };

  handleChangeRowsPerPage = (event) => {
    this.setState({ rowsPerPage: event.target.value });
  };

  isSelected = (id) => {
    return this.state.selected.indexOf(id) !== -1;
  }

  render() {
    const { classes, onDelete, onDisable, onEdit, loading, title } = this.props;
    const { data, headers, order, orderBy, selected,
            rowsPerPage, page } = this.state;
    const emptyRows = rowsPerPage - Math.min(rowsPerPage, data.length - page * rowsPerPage);

    const NoRecord = () => (
      <div className={classes.noRecordWrapper}>
        <ErrorOutline className={classes.errorIcon} />
        No Record found
      </div>
    )

    const isCheckboxEnabled = onDelete || onEdit;
    const isToolbarEnabled = selected.length > 0 && isCheckboxEnabled;

    return (
      <Paper className={classes.root}>
        <div className={classes.tableWrapper}>
          {isToolbarEnabled &&
            <ITableToolbar
              title={title}
              numSelected={selected.length}
              onDisable={onDisable}
              onDelete={onDelete}
              onEdit={onEdit}
            />
          }
          <Table className={classes.table} aria-labelledby="tableTitle">
            <ITableHead
              headers={headers}
              numSelected={selected.length}
              order={order}
              orderBy={orderBy}
              onSelectAllClick={this.handleSelectAllClick}
              onRequestSort={this.handleRequestSort}
              rowCount={data.length}
              isCheckboxEnabled={isCheckboxEnabled}
            />
            <TableBody>
              {
                !loading && stableSort(data, getSorting(order, orderBy, headers))
                  .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  .map(n => {
                    const isSelected = this.isSelected(n._id);

                    return (
                      <TableRow
                        hover
                        onClick={event => this.handleClick(event, n._id)}
                        role="checkbox"
                        aria-checked={isSelected}
                        tabIndex={-1}
                        key={n._id}
                        selected={isSelected}
                      >
                        {
                          isCheckboxEnabled &&
                          <TableCell style={{ width: 48 }} padding="checkbox">
                            <Checkbox checked={isSelected} />
                          </TableCell>
                        }
                        {Object.values(headers).map((header, i) =>
                          (<ITableCell
                              align={header.numeric ? 'right' : 'left'}
                              style={{
                                width: 'auto',
                                maxWidth: header.width || 'none',
                                minWidth: header.width || 'none',
                                paddingLeft: isCheckboxEnabled ? 0 : 24,
                                overflowWrap: 'break-word'
                              }}
                              key={`${n._id}_${header.id}`}
                              value={n[header.id]}
                            />)
                        )}
                      </TableRow>
                    );
              })}
              {emptyRows > 0 && (
                <TableRow style={{ height: 48 * emptyRows }}>
                  <TableCell colSpan={8}>
                    {data.length === 0 && !loading && <NoRecord />}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          {selected.length > 0 && (
            <span className={classes.footer}>
              {selected.length} selected
            </span>
          )}
        </div>
        <TablePagination
          component="div"
          count={data.length}
          rowsPerPage={rowsPerPage}
          rowsPerPageOptions={[4, 8, 12, 16, 20]}
          page={page}
          backIconButtonProps={{
            'aria-label': 'Previous Page',
          }}
          nextIconButtonProps={{
            'aria-label': 'Next Page',
          }}
          onChangePage={this.handleChangePage}
          onChangeRowsPerPage={this.handleChangeRowsPerPage}
        />
        {loading && <CircularProgress size={50} className={classes.loadingIcon} />}
      </Paper>
    );
  }
}

const styles = theme => ({
  root: {
    width: '100%',
    position: 'relative',
    boxShadow: 'none'
  },
  table: {
    minWidth: 750,
  },
  tableWrapper: {
    overflowX: 'auto',
  },
  loadingIcon: {
    color: theme.palette.custom.primary.main,
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginTop: -12,
    marginLeft: -12,
  },
  errorIcon: {
    marginRight: theme.spacing(2),
    fontSize: '2.5rem'
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    fontSize: '0.75rem',
    padding: theme.spacing(2.5)
  },
  noRecordWrapper: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    fontSize: '1.3rem',
    '& td': {
      display: 'none'
    }
  }
});

ITable.propTypes = {
  classes: PropTypes.object.isRequired,
  headers: PropTypes.array.isRequired,
  data: PropTypes.array.isRequired,
  onEdit: PropTypes.func,
  onDelete: PropTypes.func,
  title: PropTypes.string,
  setSelection: PropTypes.func,
};

export default withStyles(styles)(ITable);