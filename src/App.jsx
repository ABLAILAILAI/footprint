import { useEffect, useState } from 'react'
import { db } from './db'
import { generateMockEvents } from './mockEvents'
import ImportZone from './ImportZone'
import './App.css'

function App() {
  const [count, setCount] = useState(null) // null while we haven't checked the database yet
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState(null)

  function refreshCount() {
    db.events
      .count()
      .then(setCount)
      .catch((err) => setError(err.message))
  }

  useEffect(refreshCount, [])

  async function handleLoadMockData() {
    setAdding(true)
    setError(null)
    try {
      const events = generateMockEvents()
      await db.events.bulkPut(events)
      refreshCount()
    } catch (err) {
      setError(err.message)
    } finally {
      setAdding(false)
    }
  }

  return (
    <main className="app">
      <header className="app-header">
        <h1>Footprint</h1>
        <p className="tagline">
          Your year in review, built entirely from data you already own.
        </p>
      </header>

      <section className="card">
        <h2>Import your data</h2>
        <p className="card-hint">
          Drag in the export you requested from a platform, or tap to browse
          for it. Nothing ever leaves this device.
        </p>
        <ImportZone onImported={refreshCount} />
      </section>

      <section className="card card-secondary">
        <h2>No exports yet?</h2>
        <p className="card-hint">
          Try the app with generated sample data while you wait for your
          real exports to arrive.
        </p>

        {error && <p className="error">Something went wrong: {error}</p>}

        {count === null && !error ? (
          <p className="status">Loading…</p>
        ) : (
          <>
            <p className="status">
              {count === 0 ? 'No events yet.' : `${count} events loaded.`}
            </p>
            <button onClick={handleLoadMockData} disabled={adding}>
              {adding ? 'Loading…' : 'Load mock data'}
            </button>
          </>
        )}
      </section>
    </main>
  )
}

export default App
