import { classifyTitle, makeId } from './youtubeShared'

// Parses a Google Takeout YouTube history export in HTML format — the
// format Google actually delivers by default (JSON has to be chosen
// explicitly in the export settings, which most people never see).
//
// Uses the real DOM parser rather than regex/string matching, since
// Google's generated HTML has been reverse-engineered from a real
// export rather than documented, and a real DOM is far more forgiving
// of whitespace/attribute-order differences than brittle string
// matching would be.
//
// Each history entry looks roughly like:
//   <div class="outer-cell ...">
//     <div class="header-cell ..."><p class="mdl-typography--title">YouTube<br></p></div>
//     <div class="content-cell ... mdl-typography--body-1">
//       Watched <a href="...">Title</a><br>
//       Watched at 17:27<br>              (only present for "Watched" entries)
//       15 Oct 2026, 12:27:37 GMT-05:00<br>
//     </div>
//     <div class="content-cell ... text-right"></div>   (always empty — no channel info in this format)
//     <div class="content-cell ... caption">...Details: From Google Ads...</div>  (ads only)
//   </div>
//
// Known limitations: like the JSON format, no watch duration is
// included. Unlike JSON, this format also has no channel/creator name
// at all, so creator is always null here.

export function parseYouTubeHtml(htmlText) {
  const doc = new DOMParser().parseFromString(htmlText, 'text/html')
  const entries = doc.querySelectorAll('.outer-cell')

  if (entries.length === 0) {
    throw new Error("This doesn't look like a YouTube history export (no entries found)")
  }

  const events = []
  let skipped = 0

  for (const entry of entries) {
    const header = entry.querySelector('.header-cell')?.textContent.trim() ?? ''
    if (!header.startsWith('YouTube')) {
      skipped++
      continue
    }

    const caption = entry.querySelector('.mdl-typography--caption')?.textContent ?? ''
    if (caption.includes('From Google Ads')) {
      skipped++
      continue
    }

    const mainCell = entry.querySelector(
      '.content-cell.mdl-typography--body-1:not(.mdl-typography--text-right)',
    )
    const link = mainCell?.querySelector('a')
    if (!mainCell || !link) {
      skipped++
      continue
    }

    const textNodes = [...mainCell.childNodes]
      .filter((node) => node.nodeType === 3) // Node.TEXT_NODE
      .map((node) => node.textContent.trim())
      .filter(Boolean)

    const prefix = textNodes[0] ?? ''
    const dateText = textNodes[textNodes.length - 1] ?? ''

    const classified = classifyTitle(`${prefix} `)
    if (!classified) {
      skipped++
      continue
    }

    const { type } = classified
    const cleanTitle = link.textContent.trim()
    const timestamp = Date.parse(dateText)

    if (!cleanTitle || Number.isNaN(timestamp)) {
      skipped++
      continue
    }

    const titleUrl = link.getAttribute('href') ?? ''

    events.push({
      id: makeId(cleanTitle, timestamp, titleUrl),
      platform: 'youtube',
      type,
      timestamp,
      title: cleanTitle,
      creator: null,
      durationMs: null,
      extra: { titleUrl },
    })
  }

  return { events, skipped }
}
