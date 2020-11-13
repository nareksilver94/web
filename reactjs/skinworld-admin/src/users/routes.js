import React from 'react';
import { Switch, Route } from 'react-router'

import Users from './containers/users';


const UserRoutes = ({ match }) => (
  <Switch>
    <Route exact path={match.url} component={Users}/>
  </Switch>
)


export default UserRoutes