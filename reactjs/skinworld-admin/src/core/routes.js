import React from 'react'
import { Switch, Route, Redirect } from 'react-router'
import { ConnectedRouter } from 'react-router-redux'
import ReduxToastr from 'react-redux-toastr'

import { ProtectedRoute, NotFound } from './components'
import Login from '../auth/containers/login'
import Dashboard from './containers/dashboard'

const appRoutes = ({ history }) => (
  <ConnectedRouter history={history}>
    <div>
      <Switch>
        <Redirect exact from='/' to='/dashboard/users' />
        <Route path='/login' component={Login} />
        <ProtectedRoute path='/dashboard' component={Dashboard} />
        <Route path='*' component={NotFound} />
      </Switch>
      <ReduxToastr
        timeOut={4000}
        newestOnTop={false}
        preventDuplicates
        position='top-right'
        transitionIn='fadeIn'
        transitionOut='fadeOut'
      />
    </div>
  </ConnectedRouter>
)

export default appRoutes
