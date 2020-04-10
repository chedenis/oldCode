import React from 'react';
import ReactDOM from 'react-dom';
import App from './App';
import './index.css';

import './index.css';
import App from './App';
import registerServiceWorker from './registerServiceWorker';

ReactDOM.render(
  <Provider store={configureStore()}>
   <App />
  </Provider>,
  document.getElementById('root')
 );
 registerServiceWorker();