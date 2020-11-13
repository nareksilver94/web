import React from 'react';
import { Switch, Route } from 'react-router'

import Withdrawals from './containers/withdrawals';
import WithdrawalDetail from './containers/withdrawal-detail';


const WithdrawalRoutes = ({ match }) => (
  <Switch>
    <Route exact path={match.url} component={Withdrawals}/>
    <Route exact path={`${match.url}/:id`} component={WithdrawalDetail}/>
  </Switch>
)


export default WithdrawalRoutes