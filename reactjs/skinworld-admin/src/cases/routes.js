import React from 'react';
import { Switch, Route } from 'react-router'

import Cases from './containers/cases';
import CasesEdit from './containers/cases-edit';

const CaseRoutes = ({ match }) => (
  <Switch>
    <Route exact path={match.url} component={Cases}/>
    <Route exact path={`${match.url}/:id`} component={CasesEdit}/>
  </Switch>
)


export default CaseRoutes