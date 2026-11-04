import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './styles/trainer.css'
import App from './App.tsx'
import DroneProvider from './drone/DroneProvider.tsx'
import MetronomeProvider from './metronome/MetronomeProvider.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <DroneProvider>
      <MetronomeProvider>
        <App />
      </MetronomeProvider>
    </DroneProvider>
  </StrictMode>,
)
