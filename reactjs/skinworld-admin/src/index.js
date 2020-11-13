import React from 'react';
import ReactDOM from 'react-dom';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react'
import { MuiThemeProvider } from '@material-ui/core';

import AppRoutes from './core/routes';
import configureStore from './core/configure-store';
import theme from './core/theme/light-theme';
import registerServiceWorker from './registerServiceWorker';

import { subscribe } from './core/socket';

import './index.css'
import 'react-redux-toastr/lib/css/react-redux-toastr.min.css';

const { store, persistor, history } = configureStore();

const App = (
  <MuiThemeProvider theme={theme}>
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <AppRoutes history={history}/>
      </PersistGate>
    </Provider>
  </MuiThemeProvider>
)

ReactDOM.render(App, document.getElementById('root'));
registerServiceWorker();

subscribe();
