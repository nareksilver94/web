import { applyMiddleware, createStore, compose } from 'redux';
import { persistStore } from 'redux-persist';
import createSagaMiddleware from 'redux-saga';
import { routerMiddleware } from 'react-router-redux';
import createHistory from 'history/createBrowserHistory';

import appReducer from './reducers';
import rootSaga from './sagas';

const composeEnhancers = window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ || compose;

const configureStore = () => {
  
  const history = createHistory();

  const sagaMiddleware = createSagaMiddleware();
  const routeMiddleware = routerMiddleware(history);

  const store = createStore(
    appReducer,
    composeEnhancers(
      applyMiddleware(sagaMiddleware, routeMiddleware)
    )
  );
  const persistor = persistStore(store);

  sagaMiddleware.run(rootSaga);

  return { store, persistor, history };
}

export default configureStore;