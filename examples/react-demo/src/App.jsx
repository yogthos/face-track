import { useState, useRef, useEffect } from 'react'
import FaceTracker from './components/FaceTracker'
import './App.css'

function App() {
  return (
    <div className="app">
      <header className="app-header">
        <h1>Face Track - Real-time Face Landmark Detection</h1>
        <p>Track and visualize 68 facial landmarks in real-time</p>
      </header>

      <main className="app-main">
        <FaceTracker />
      </main>

      <footer className="app-footer">
        <p>Built with React + TensorFlow.js</p>
      </footer>
    </div>
  )
}

export default App
