import Dexie from 'dexie'

// Every platform parser converts its platform's export into this one
// unified shape, so stats/charts/cards never have to know about raw
// per-platform formats.
//
// Event shape:
//   id          string   unique id
//   platform    string   "youtube" | "spotify" | "netflix" | "instagram" | ...
//   type        string   "watch" | "listen" | "search" | "like" | "comment" | "follow"
//   timestamp   number   ms since epoch
//   title       string   video/song/show title, post caption, search query, ...
//   creator     string | null   channel/artist/show name
//   durationMs  number | null   how long the watch/listen lasted
//   extra       object   platform-specific fields parsers don't want to lose

export const db = new Dexie('footprint')

db.version(1).stores({
  events: 'id, platform, type, timestamp',
})
