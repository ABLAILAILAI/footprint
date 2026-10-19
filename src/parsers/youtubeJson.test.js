import { describe, expect, it } from 'vitest'
import { parseYouTubeJson } from './youtubeJson'

const SAMPLE = [
  {
    header: 'YouTube',
    title: 'Watched How Neural Networks Really Work',
    titleUrl: 'https://www.youtube.com/watch?v=abc123',
    subtitles: [{ name: '3Blue1Brown', url: 'https://www.youtube.com/channel/xyz' }],
    time: '2026-03-01T20:15:30.000Z',
    products: ['YouTube'],
  },
  {
    header: 'YouTube',
    title: 'Searched for neural network backpropagation',
    time: '2026-03-01T20:10:00.000Z',
    products: ['YouTube'],
  },
  {
    // Removed/deleted video: Google's own placeholder title still starts
    // with "Watched ", so this should parse as a real (if generic) event
    // rather than being specially detected and dropped.
    header: 'YouTube',
    title: 'Watched a video that has been removed',
    time: '2026-02-20T10:00:00.000Z',
  },
  {
    // A real ad impression: formatted exactly like a genuine watch, only
    // distinguishable by this details flag (confirmed against a real
    // export — ~9% of one real account's history was entries like this).
    header: 'YouTube',
    title: 'Watched Some Sponsored Video',
    time: '2026-02-15T09:00:00.000Z',
    details: [{ name: 'From Google Ads' }],
  },
  {
    // Not YouTube at all — should be skipped, not mis-tagged.
    header: 'Search',
    title: 'Searched for weather today',
    time: '2026-02-10T08:00:00.000Z',
  },
  {
    // Missing a parseable time — can't place this on a timeline.
    header: 'YouTube',
    title: 'Watched Some Video With No Timestamp',
  },
]

describe('parseYouTubeJson', () => {
  it('converts recognizable watch and search entries into unified events', () => {
    const { events, skipped } = parseYouTubeJson(JSON.stringify(SAMPLE))

    // Skipped: the ad, the non-YouTube entry, and the one with no
    // parseable timestamp.
    expect(events).toHaveLength(3)
    expect(skipped).toBe(3)

    const watch = events.find((e) => e.title === 'How Neural Networks Really Work')
    expect(watch.creator).toBe('3Blue1Brown')
    expect(watch.platform).toBe('youtube')
    expect(watch.type).toBe('watch')
    expect(watch.durationMs).toBeNull()
    expect(watch.timestamp).toBe(Date.parse('2026-03-01T20:15:30.000Z'))

    const search = events.find((e) => e.type === 'search')
    expect(search.title).toBe('neural network backpropagation')
    expect(search.creator).toBeNull()

    const removed = events.find((e) => e.title === 'a video that has been removed')
    expect(removed.type).toBe('watch')

    expect(events.some((e) => e.title === 'Some Sponsored Video')).toBe(false)
  })

  it('produces a stable id for the same entry, for safe re-import', () => {
    const first = parseYouTubeJson(JSON.stringify(SAMPLE)).events
    const second = parseYouTubeJson(JSON.stringify(SAMPLE)).events
    expect(first[0].id).toBe(second[0].id)
  })

  it('throws a clear error for something that is not a Takeout export', () => {
    expect(() => parseYouTubeJson(JSON.stringify({ not: 'an array' }))).toThrow(
      /expected a json array/i,
    )
  })

  it('throws a friendly error for a file that is not valid JSON at all', () => {
    expect(() => parseYouTubeJson('{not valid json')).toThrow(/doesn't look like a valid/i)
  })
})
