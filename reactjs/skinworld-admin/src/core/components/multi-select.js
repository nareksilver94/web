import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { withStyles, Chip } from '@material-ui/core';
import { compose, isEmpty, symmetricDifference } from 'ramda';
import ISelect from './select';


const styles = theme => ({
  root: {
    display: 'flex',
    flexWrap: 'wrap',
  },
  formControl: {
    margin: theme.spacing.unit,
    minWidth: 120,
    maxWidth: 300,
  },
  chips: {
    display: 'flex',
    flexWrap: 'wrap',
  },
  chip: {
    margin: theme.spacing.unit / 4,
  },
});

const ITEM_HEIGHT = 48;
const ITEM_PADDING_TOP = 8;
const MenuProps = {
  PaperProps: {
    style: {
      maxHeight: ITEM_HEIGHT * 4.5 + ITEM_PADDING_TOP,
      width: 250,
    },
  },
};

const eqValues = compose(isEmpty, symmetricDifference)

class MultiSelect extends Component {
  state = {
    checked: [],
    options: {}
  };

  componentDidMount() {
    this.setState({
      checked: this.props.value,
      options: this.props.options
    })
  }

  componentWillReceiveProps(nextProps) {
    if (!eqValues(this.state.checked, nextProps.value)) {
      this.setState({ checked: nextProps.value });
    }
  }

  handleChange = event => {
    this.setState({ checked: event.target.value });
    this.props.onChange(event.target.value);
  };

  render() {
    const { classes, theme, options, onChange, ...rest } = this.props;
    const { checked } = this.state;
    const checkedValues = Object.keys(options).map(key => {
      console.log('==> Key: ', options[key], key);

      return {
        value: options[key],
        key,
        checked: checked.indexOf(key) !== -1
      }
    });

    return (
      <div className={classes.root}>
        <ISelect
          multiple
          value={this.state.checked}
          onChange={this.handleChange}
          renderValue={selected => 
            <div className={classes.chips}>
              {selected.map(i => {
                console.log(selected);
                return <Chip key={i} label={options[i]} className={classes.chip} />
              })}
            </div>
          }
          MenuProps={MenuProps}
          options={checkedValues}
          {...rest}
        />
      </div>
    );
  }
}

MultiSelect.propTypes = {
  classes: PropTypes.object.isRequired,
  theme: PropTypes.object.isRequired,
  value: PropTypes.array.isRequired,
  onChange: PropTypes.func.isRequired
};

export default withStyles(styles, { withTheme: true })(MultiSelect);