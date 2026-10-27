import { useEffect, useState } from 'react'
import { db } from './db'
import { generateMockEvents } from './mockEvents'
import ImportZone from './ImportZone'
import Stats from './Stats'
import Hero from './Hero'
import Footer from './Footer'
import Hands from './Hands'
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

  async function handleDeleteAllData() {
    const confirmed = window.confirm(
      'Delete all data stored in this browser? This removes everything imported and any mock data, and cannot be undone.',
    )
    if (!confirmed) return

    setError(null)
    try {
      await db.events.clear()
      refreshCount()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <>
      <Hands />
      <main className="app">
        <Hero />

      <section className="card" id="import">
        <h2>Import your data</h2>
        <p className="card-hint">
          Drag in the export you requested from a platform, or tap to browse
          for it. Nothing ever leaves this device.
        </p>
        <ImportZone onImported={refreshCount} />
      </section>

      <Stats refreshToken={count} />

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
            <button
              onClick={handleLoadMockData}
              disabled={adding || count > 0}
              title={count > 0 ? 'Delete your current data first to load a fresh batch' : undefined}
            >
              {adding ? 'Loading…' : 'Load mock data'}
            </button>
            {count > 0 && (
              <p className="card-hint">
                Delete your current data first (below) to load a fresh batch — this
                keeps old and new sample data from mixing together into a
                nonsense "year in review."
              </p>
            )}
          </>
        )}

        <div className="danger-zone">
          <p className="card-hint">
            Everything above is stored only in this browser. You can wipe it
            at any time — this clears mock data and anything you've
            imported, for good.
          </p>
          <button
            type="button"
            className="button-plain"
            onClick={handleDeleteAllData}
            disabled={count === 0 || count === null}
          >
            Delete all my data
          </button>
        </div>
      </section>

        <Footer />
      </main>
    </>
  )
}

export default App
