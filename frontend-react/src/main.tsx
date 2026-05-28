import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import '@fontsource-variable/plus-jakarta-sans';
import './index.css';

const root = document.getElementById('root');
if (!root) throw new Error('[SolarCells] #root element not found in index.html');

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
