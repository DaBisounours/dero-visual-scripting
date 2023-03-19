import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import 'rsuite/dist/rsuite.min.css';

import './index.css'
import { CustomProvider } from 'rsuite';
import { Tests } from './Tests';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <CustomProvider theme={'dark'}>
      <App />
      {/*<Tests/>*/}
    </CustomProvider>
  </React.StrictMode>
)
