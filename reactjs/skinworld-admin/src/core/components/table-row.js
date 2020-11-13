import React, { Component, Fragment } from 'react';

import {
    Collapse,
    TableContainer,
    Paper,
    Table, TableBody, TableHead, TableCell, TableRow,
    withStyles,
    Tooltip, IconButton
} from '@material-ui/core';
import {
    ExpandLess as ExpandLessIcon,
    ExpandMore as ExpandMoreIcon
} from '@material-ui/icons';


class ITableRow extends Component {
    state = {
        expanded: false,
        data: [],
        rest: {}
    }

    toggleExpander = ( e ) => {
        if ( this.props.iscollapse ) {
            this.setState( { expanded: !this.state.expanded }, this.props.onClick( e ) );
        } else {
            this.props.onClick( e );
        }

    }

    componentDidMount() {
        this.setState( {
            data: this.props.values
        } );
    }

    render() {
        const { data, expanded } = this.state;
        const { values, children, classes, key, ...rest } = this.props;

        let renderHtml = (
            <TableRow { ...rest } onClick={ this.toggleExpander }>
                { rest.iscollapse &&
                    <TableCell className={ classes.expandcell } />
                }
                { children }
            </TableRow>
        );
        if ( data.length > 0 ) {
            renderHtml = (
                <Fragment>
                    <TableRow { ...rest } onClick={ this.toggleExpander } className={ expanded ? classes.selected : null }>
                        <TableCell className={ classes.expandcell } padding="checkbox">
                            <Tooltip title={ expanded ? "Collapse" : "Expand" }>
                                <IconButton aria-label="Edit">
                                    { expanded ? ( <ExpandLessIcon /> ) : ( <ExpandMoreIcon /> ) }
                                </IconButton>
                            </Tooltip>
                        </TableCell>
                        { children }
                    </TableRow>
                    { rest.iscollapse && (
                        <TableRow>
                            <TableCell colSpan={ this.props.length + 1 } className={ classes.collapse }>
                                <Collapse
                                    in={ this.state.expanded }
                                    timeout='auto'
                                    unmountOnExit={ true }
                                >
                                    <TableContainer component={ Paper } >
                                        <Table aria-label="table" size="small">
                                            <TableHead>
                                                <TableRow>
                                                    <TableCell className={classes.expandcell} />
                                                    {rest.expheaders.map(header => (
                                                        <TableCell key={`subcell_${key}_${header.label}`}>{header.label}</TableCell>
                                                    ))}
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {data.map(row => (
                                                    <TableRow key={row._id}>
                                                        <TableCell className={classes.expandcell} />
                                                        {rest.expheaders.map(header => (
                                                            <TableCell key={`subth_${key}_${header.label}`} component="th" scope="row">
                                                                {isNaN(row[header.id]) ? row[header.id] : row[header.id].toFixed(2)}
                                                            </TableCell>
                                                        ))}
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </TableContainer>
                                </Collapse>
                            </TableCell>
                        </TableRow>
                    ) }
                </Fragment>
            )
        }
        return (
            <Fragment>
                { renderHtml }
            </Fragment>
        )
    }
}
const styles = theme => ( {
    collapse: {
        padding: 0,
        borderBottom: "0px solid"
    },
    expandcell: {
        width: `${theme.spacing( 4 )}px`,
    }
} );


export default withStyles( styles )( ITableRow )