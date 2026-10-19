// Shared between youtubeJson.js and youtubeHtml.js, since Google Takeout
// delivers YouTube history in either format depending on an export
// setting most people never touch (HTML is the default; JSON has to be
// chosen explicitly).

export const WATCHED_PREFIX = 'Watched '
export const SEARCHED_PREFIX = 'Searched for '

export function hash(str) {
  let h = 0
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0
  }
  return (h >>> 0).toString(36)
}

/** Turns a raw title like "Watched Some Video" into { type, cleanTitle },
 * or null if it's some other activity type we don't handle (ads, survey
 * answers, subscriptions, etc.). */
export function classifyTitle(title) {
  if (title.startsWith(WATCHED_PREFIX)) {
    return { type: 'watch', cleanTitle: title.slice(WATCHED_PREFIX.length) }
  }
  if (title.startsWith(SEARCHED_PREFIX)) {
    return { type: 'search', cleanTitle: title.slice(SEARCHED_PREFIX.length) }
  }
  return null
}

export function makeId(cleanTitle, timestamp, url) {
  return `youtube-${hash(cleanTitle + timestamp + url)}`
}
