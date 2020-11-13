import React from 'react';
import { Switch, Route } from 'react-router'

import Transactions from './containers/transactions';


const TransactionRoutes = ({ match }) => (
  <Switch>
    <Route exact path={match.url} component={Transactions}/>
  </Switch>
)


export default TransactionRoutes