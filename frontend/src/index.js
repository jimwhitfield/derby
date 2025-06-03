import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css'; // Tailwind CSS will be imported here
import App from './App';
// import reportWebVitals from './reportWebVitals'; // REMOVED
import { GameProvider } from './contexts/GameContext';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <GameProvider>
      <App />
    </GameProvider>
  </React.StrictMode>
);

// reportWebVitals(); // REMOVED

