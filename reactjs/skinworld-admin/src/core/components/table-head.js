import React from 'react';
import PropTypes from 'prop-types';
import {
  TableCell, TableHead,
  TableRow, TableSortLabel,
  Checkbox, Tooltip,
} from '@material-ui/core';


class ITableHead extends React.Component {
  createSortHandler = property => event => {
    this.props.onRequestSort(event, property);
  };

  render() {
    const { headers, onSelectAllClick, order, orderBy,
      numSelected, rowCount, isCheckboxEnabled, iscollapse } = this.props;

    return (
      <TableHead>
        <TableRow>
          {
            isCheckboxEnabled &&
            <TableCell padding="checkbox">
              <Checkbox
                indeterminate={numSelected > 0 && numSelected < rowCount}
                checked={numSelected === rowCount}
                onChange={onSelectAllClick}
              />
            </TableCell>
          }
          {
            iscollapse && 
            <TableCell padding="checkbox" />
          }
          {headers.map(row => {
            return (
              <TableCell
                key={row.id}
                style={{ paddingLeft: isCheckboxEnabled ? 0 : 24 }}
                align={row.numeric ? 'right' : 'left'}
                padding={row.disablePadding ? 'none' : 'default'}
                sortDirection={orderBy === row.id ? order : false}
              >
                {row.filterComponent}
                {!row.filterComponent &&
                  <Tooltip
                    title="Sort"
                    placement={row.numeric ? 'bottom-end' : 'bottom-start'}
                    enterDelay={300}
                  >
                    <TableSortLabel
                      active={orderBy === row.id}
                      direction={order}
                      onClick={this.createSortHandler(row.id)}
                    >
                      {row.label}
                    </TableSortLabel>
                  </Tooltip>
                }
              </TableCell>
            );
          }, this)}
        </TableRow>
      </TableHead>
    );
  }
}

ITableHead.propTypes = {
  headers: PropTypes.array.isRequired,
  numSelected: PropTypes.number.isRequired,
  onRequestSort: PropTypes.func.isRequired,
  onSelectAllClick: PropTypes.func.isRequired,
  order: PropTypes.string.isRequired,
  orderBy: PropTypes.string.isRequired,
  rowCount: PropTypes.number.isRequired,
};


export default ITableHead;


