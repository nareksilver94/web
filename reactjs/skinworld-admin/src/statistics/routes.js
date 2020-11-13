import React from 'react';
import { Switch, Route } from 'react-router'

import Statistics from './containers/statistics';

const StatisticsRoutes = ({ match }) => (
  <Switch>
    <Route exact path={match.url} component={Statistics}/>
  </Switch>
)


export default StatisticsRoutes