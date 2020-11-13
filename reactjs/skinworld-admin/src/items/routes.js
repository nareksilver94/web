import React from 'react';
import { Switch, Route } from 'react-router'

import Items from './containers/items';


const ItemRoutes = ({ match }) => (
  <Switch>
    <Route exact path={match.url} component={Items}/>
  </Switch>
)


export default ItemRoutes