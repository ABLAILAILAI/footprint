import { describe, expect, it } from 'vitest'
import { parseYouTubeHtml } from './youtubeHtml'
import { parseYouTubeJson } from './youtubeJson'

// Modeled on the real structure of a Google Takeout YouTube history HTML
// export (verified against an actual downloaded export), but with
// placeholder content — none of this is real personal data.
function entry({
  header = 'YouTube',
  body,
  caption = '<b>Products:</b><br>&emsp;YouTube<br><b>Why is this here?</b><br>Because reasons.',
}) {
  return `
    <div class="outer-cell mdl-cell mdl-cell--12-col mdl-shadow--2dp">
      <div class="mdl-grid">
        <div class="header-cell mdl-cell mdl-cell--12-col"><p class="mdl-typography--title">${header}<br></p></div>
        <div class="content-cell mdl-cell mdl-cell--6-col mdl-typography--body-1">${body}</div>
        <div class="content-cell mdl-cell mdl-cell--6-col mdl-typography--body-1 mdl-typography--text-right"></div>
        <div class="content-cell mdl-cell mdl-cell--12-col mdl-typography--caption">${caption}</div>
      </div>
    </div>
  `
}

function page(entries) {
  return `<html><body>${entries.join('')}</body></html>`
}

const WATCH_ENTRY = entry({
  body: 'Watched <a href="https://www.youtube.com/watch?v=abc123">How Neural Networks Really Work</a><br>Watched at 17:27<br>15 Oct 2026, 12:27:37 GMT-05:00<br>',
})

const SEARCH_ENTRY = entry({
  body: 'Searched for <a href="https://www.google.com/search?q=x">neural network backpropagation</a><br>15 Oct 2026, 12:10:22 GMT-05:00<br>',
})

const AD_ENTRY = entry({
  body: 'Watched <a href="https://www.youtube.com/watch?v=ad999">Some Ad</a><br>Watched at 09:00<br>15 Feb 2026, 09:00:00 GMT-05:00<br>',
  caption:
    '<b>Products:</b><br>&emsp;YouTube<br><b>Details:</b><br>&emsp;From Google Ads<br><b>Why is this here?</b><br>Because reasons.',
})

const SURVEY_ENTRY = entry({
  body: 'Answered survey question<br>Answer: Something<br>7 Oct 2026, 08:12:50 GMT-05:00<br>',
})

const NON_YOUTUBE_ENTRY = entry({
  header: 'Search',
  body: 'Searched for <a href="https://www.google.com/search?q=y">weather today</a><br>1 Jan 2026, 00:00:00 GMT-05:00<br>',
})

describe('parseYouTubeHtml', () => {
  it('converts watch and search entries, and skips ads/surveys/non-YouTube entries', () => {
    const html = page([WATCH_ENTRY, SEARCH_ENTRY, AD_ENTRY, SURVEY_ENTRY, NON_YOUTUBE_ENTRY])
    const { events, skipped } = parseYouTubeHtml(html)

    expect(events).toHaveLength(2)
    expect(skipped).toBe(3)

    const watch = events.find((e) => e.type === 'watch')
    expect(watch.title).toBe('How Neural Networks Really Work')
    expect(watch.creator).toBeNull() // this format never has channel info
    expect(watch.durationMs).toBeNull()
    expect(watch.extra.titleUrl).toBe('https://www.youtube.com/watch?v=abc123')

    const search = events.find((e) => e.type === 'search')
    expect(search.title).toBe('neural network backpropagation')
  })

  it('produces a stable id for the same entry, for safe re-import', () => {
    const html = page([WATCH_ENTRY])
    const first = parseYouTubeHtml(html).events
    const second = parseYouTubeHtml(html).events
    expect(first[0].id).toBe(second[0].id)
  })

  it('produces the same id as the JSON parser for the same underlying event', () => {
    const htmlEvents = parseYouTubeHtml(page([WATCH_ENTRY])).events
    const jsonEvents = parseYouTubeJson(
      JSON.stringify([
        {
          header: 'YouTube',
          title: 'Watched How Neural Networks Really Work',
          titleUrl: 'https://www.youtube.com/watch?v=abc123',
          time: '2026-10-15T17:27:37.000Z', // same instant as "15 Oct 2026, 12:27:37 GMT-05:00"
        },
      ]),
    ).events

    expect(htmlEvents[0].id).toBe(jsonEvents[0].id)
  })

  it('throws a friendly error for a page with no recognizable entries', () => {
    expect(() => parseYouTubeHtml('<html><body>Not a Takeout export</body></html>')).toThrow(
      /doesn't look like a youtube history export/i,
    )
  })
})
