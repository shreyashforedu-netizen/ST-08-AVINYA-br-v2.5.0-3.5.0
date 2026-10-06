import React, { useEffect } from 'react';
import './App.css';
import GlobeView from './components/Globe/GlobeView';

export default function App() {
  useEffect(() => {
    // Smoothly fade out the initial loader once React has mounted
    const loader = document.getElementById('mc-loader-wrapper');
    if (loader) {
      // Small delay to ensure child components have rendered
      setTimeout(() => {
        loader.classList.add('fade-out');
        // Remove it from the DOM after transition completes
        setTimeout(() => {
          if (loader.parentNode) loader.parentNode.removeChild(loader);
        }, 1000); // Matches the 1s CSS transition
      }, 100);
    }
  }, []);

  return (
    <GlobeView />
  );
}
