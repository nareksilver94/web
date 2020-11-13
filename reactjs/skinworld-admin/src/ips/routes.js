import React from 'react';
import { Switch, Route } from 'react-router'

import Ips from './containers/ips';

const IpRoutes = ({ match }) => (
  <Switch>
    <Route exact path={match.url} component={Ips}/>
  </Switch>
)


export default IpRoutes