import { useRef, useState } from 'react'
import { locatePlatformSource } from './detectPlatform'
import { parsers } from './parsers'
import { db } from './db'
import './ImportZone.css'

const PLATFORM_LABELS = {
  youtube: 'YouTube',
  spotify: 'Spotify',
  netflix: 'Netflix',
  instagram: 'Instagram',
}

// A real history export, as plain text/HTML/JSON, is at most a few tens
// of MB even with years of activity. A .zip much bigger than that is a
// sign the whole Takeout archive got dropped in with photos/videos still
// inside — JSZip has to open the archive to scan it, and doing that for
// something gigabytes in size can freeze the tab. Caught here, before
// that happens, with a message telling the person what to do instead.
const MAX_ZIP_BYTES = 50 * 1024 * 1024

function ImportZone({ onImported }) {
  // status: 'checking' | 'imported' | 'detected' | 'unrecognized' | 'too-large' | 'error'
  const [files, setFiles] = useState([])
  const [isDragOver, setIsDragOver] = useState(false)
  const inputRef = useRef(null)

  function updateFile(id, patch) {
    setFiles((prev) => prev.map((f) => (f.id === id ? { ...f, ...patch } : f)))
  }

  async function handleFiles(fileList) {
    const incoming = Array.from(fileList).map((file) => ({
      id: crypto.randomUUID(),
      name: file.name,
      status: 'checking',
      file,
    }))
    setFiles((prev) => [...incoming, ...prev])

    for (const entry of incoming) {
      if (entry.file.name.toLowerCase().endsWith('.zip') && entry.file.size > MAX_ZIP_BYTES) {
        updateFile(entry.id, { status: 'too-large' })
        continue
      }

      try {
        const source = await locatePlatformSource(entry.file)

        if (!source) {
          updateFile(entry.id, { status: 'unrecognized' })
          continue
        }

        const parse = parsers[source.platform]?.[source.format]
        if (!parse) {
          // We can tell what this is, just can't read it yet.
          updateFile(entry.id, { status: 'detected', platform: source.platform })
          continue
        }

        const { events, skipped } = parse(source.text)
        await db.events.bulkPut(events)
        updateFile(entry.id, {
          status: 'imported',
          platform: source.platform,
          importedCount: events.length,
          skippedCount: skipped,
        })
        onImported?.()
      } catch (err) {
        updateFile(entry.id, { status: 'error', error: err.message })
      }
    }
  }

  function handleDrop(event) {
    event.preventDefault()
    setIsDragOver(false)
    handleFiles(event.dataTransfer.files)
  }

  return (
    <div className="import-zone">
      <div
        className={`dropzone${isDragOver ? ' dropzone-active' : ''}`}
        onDragOver={(e) => {
          e.preventDefault()
          setIsDragOver(true)
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') inputRef.current.click()
        }}
      >
        Drag your export files here, or tap to browse
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".zip,.json,.csv,.html"
          hidden
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      {files.length === 0 ? (
        <p className="status">No files imported yet.</p>
      ) : (
        <ul className="file-list">
          {files.map((f) => (
            <li key={f.id}>
              <span className="file-name">{f.name}</span>
              {f.status === 'checking' && <span className="tag tag-checking">Checking…</span>}
              {f.status === 'imported' && (
                <span className="tag tag-imported">
                  {PLATFORM_LABELS[f.platform]}: {f.importedCount} events
                  {f.skippedCount > 0 ? ` (${f.skippedCount} skipped)` : ''}
                </span>
              )}
              {f.status === 'detected' && (
                <span className="tag tag-detected">
                  {PLATFORM_LABELS[f.platform]} (import not supported yet)
                </span>
              )}
              {f.status === 'unrecognized' && (
                <span className="tag tag-unrecognized">Unrecognized file</span>
              )}
              {f.status === 'too-large' && (
                <span className="tag tag-error">
                  Too big to scan in the browser — open the zip and drag in just the
                  history file instead (e.g. watch-history.html)
                </span>
              )}
              {f.status === 'error' && (
                <span className="tag tag-error">Couldn't read file: {f.error}</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default ImportZone
