import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import cn from 'classnames';
import PropTypes from 'prop-types';
import { withStyles, FormControl, Select, MenuItem,
    InputLabel, Checkbox, OutlinedInput } from '@material-ui/core';

export class ISelect extends Component {

    constructor(props) {
        super(props);

        this.state = {
            labelWidth: 0
        };
    }

    componentDidMount() {
        if (this.props.label){
            this.setState({
                labelWidth: ReactDOM.findDOMNode(this.InputLabelRef).offsetWidth
            });
        }
    }

    render() {
        const { classes, className, options, label, meta: { touched, error }={},
                noneEnabled, variant, input, small, style, ...otherProps } = this.props;
        
        const renderSelectOptions = ({ key, value, checked }) => {
            return (
                <MenuItem 
                    key={`${key}-${value}`}
                    value={key}
                >
                    {checked !== undefined && <Checkbox checked={checked} />}
                    {value}
                </MenuItem>
            );
        }
    
        return (
            <FormControl
                variant={variant}
                className={cn(classes.wrapper, className, {
                    'small': !!small
                })}
                style={style || {}}
            >
                {label &&
                    <InputLabel
                        htmlFor={label.toLowerCase()}
                        ref={ref => {
                            this.InputLabelRef = ref;
                        }}
                    >
                        {label}
                    </InputLabel>
                }
                <Select
                    {...input}
                    onChange={e => input.onChange(e.target.value)}
                    input={
                        <OutlinedInput
                            name={label && label.toLowerCase()}
                            id={label && label.toLowerCase()}
                            labelWidth={this.state.labelWidth}
                        />
                    }
                    variant={variant}
                    error={touched && !!error}
                    {...otherProps}
                >
                    {noneEnabled &&
                        (<MenuItem value="">
                            <em>None</em>
                        </MenuItem>)}
                    
                    {options.map(renderSelectOptions)}
                </Select>
                {touched && error && <span className={classes.error}>{error}</span>}
            </FormControl>
        );
    }
}

const styles = theme => ({
    wrapper: {
        display: 'flex',

        '&>div': {
            height: 43
        },
        '& input': {
            padding: 12
        },
        '& label': {
            transform: 'translate(12px, 15px) scale(1)'
        },
        '&.small': {
            height: 'inherit',
            
            '& div div div': {
                padding: `6px 24px 6px 16px`,
                fontSize: '0.8rem'
            }
        }
    },
    error: {
        color: theme.palette.error.main,
        fontSize: 12,
        position: 'absolute',
        marginTop: theme.spacing(6)
    }
});

ISelect.propTypes = {
    classes: PropTypes.object.isRequired,
    options: PropTypes.array.isRequired,
    variant: PropTypes.string,
    val: PropTypes.any,
    noneEnabled: PropTypes.bool,
};


export default withStyles(styles)(ISelect);