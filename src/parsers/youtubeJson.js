import { classifyTitle, makeId } from './youtubeShared'

// Parses a Google Takeout YouTube history export in JSON format
// (watch-history.json and search-history.json are the same shape,
// distinguished only by each entry's title text). Google has changed
// this format before and doesn't document it formally, so this skips
// anything that doesn't look right instead of throwing — better to
// import 95% of a file than crash on it.
//
// Known limitation: Takeout does not include how long a video was
// watched, so durationMs is always null here.

function isAd(entry) {
  return Array.isArray(entry.details) && entry.details.some((d) => d?.name === 'From Google Ads')
}

export function parseYouTubeJson(jsonText) {
  let raw
  try {
    raw = JSON.parse(jsonText)
  } catch {
    throw new Error("This doesn't look like a valid YouTube export (not readable JSON)")
  }

  if (!Array.isArray(raw)) {
    throw new Error('Expected a JSON array of YouTube history entries')
  }

  const events = []
  let skipped = 0

  for (const entry of raw) {
    if (!entry || typeof entry !== 'object') {
      skipped++
      continue
    }

    const header = typeof entry.header === 'string' ? entry.header : ''
    if (!header.startsWith('YouTube')) {
      skipped++
      continue
    }

    // Ad impressions are recorded the same way as real watches (same
    // "Watched <title>" text), distinguished only by this details flag —
    // they're not something the user actually chose to watch.
    if (isAd(entry)) {
      skipped++
      continue
    }

    const title = typeof entry.title === 'string' ? entry.title : ''
    const classified = classifyTitle(title)
    if (!classified) {
      skipped++
      continue
    }

    const { type, cleanTitle } = classified
    const timestamp = typeof entry.time === 'string' ? Date.parse(entry.time) : NaN

    if (!cleanTitle || Number.isNaN(timestamp)) {
      skipped++
      continue
    }

    const creator = entry.subtitles?.[0]?.name ?? null
    const titleUrl = typeof entry.titleUrl === 'string' ? entry.titleUrl : ''

    events.push({
      id: makeId(cleanTitle, timestamp, titleUrl),
      platform: 'youtube',
      type,
      timestamp,
      title: cleanTitle,
      creator,
      durationMs: null,
      extra: { titleUrl },
    })
  }

  return { events, skipped }
}
