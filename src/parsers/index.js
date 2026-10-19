import { parseYouTubeJson } from './youtubeJson'
import { parseYouTubeHtml } from './youtubeHtml'

// Maps a platform name (as returned by detectPlatform) and file format
// to the function that turns its raw export text into unified events.
// A platform/format combination with no entry here is one we can detect
// but can't parse yet.
export const parsers = {
  youtube: {
    json: parseYouTubeJson,
    html: parseYouTubeHtml,
  },
}
