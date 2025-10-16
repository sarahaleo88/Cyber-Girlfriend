import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './styles/index.css'
import * as serviceWorkerRegistration from './services/serviceWorkerRegistration'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

// Register service worker for PWA functionality
serviceWorkerRegistration.register({
  onSuccess: () => {
    console.log('Service worker registered successfully')
  },
  onUpdate: (registration) => {
    console.log('New content available, please refresh')
    // Optionally show a notification to the user
    if (confirm('New version available! Reload to update?')) {
      registration.waiting?.postMessage({ type: 'SKIP_WAITING' })
      window.location.reload()
    }
  },
  onOffline: () => {
    console.log('App is running in offline mode')
  },
  onOnline: () => {
    console.log('App is back online')
  },
})