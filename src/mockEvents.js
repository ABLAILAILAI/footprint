const YOUTUBE_VIDEOS = [
  { title: 'How Neural Networks Really Work', creator: '3Blue1Brown' },
  { title: 'Illinois vs. Ohio State Highlights', creator: 'Big Ten Network' },
  { title: 'Lo-fi Beats to Study To', creator: 'ChilledCow' },
  { title: 'Building a CPU From Scratch', creator: 'Ben Eater' },
]

const SPOTIFY_SONGS = [
  { title: 'Blinding Lights', creator: 'The Weeknd' },
  { title: 'As It Was', creator: 'Harry Styles' },
  { title: 'good 4 u', creator: 'Olivia Rodrigo' },
  { title: 'Sunflower', creator: 'Post Malone' },
]

const NETFLIX_SHOWS = [
  { title: 'Stranger Things', creator: null },
  { title: 'The Bear', creator: null },
  { title: 'Formula 1: Drive to Survive', creator: null },
]

const INSTAGRAM_ACTIONS = [
  { type: 'like', title: 'Liked a post from a friend', creator: null },
  { type: 'comment', title: 'Commented "congrats!!"', creator: null },
  { type: 'follow', title: 'Started following a new account', creator: null },
]

function randomItem(list) {
  return list[Math.floor(Math.random() * list.length)]
}

function randomTimestampInPastYear() {
  const now = Date.now()
  const oneYearMs = 365 * 24 * 60 * 60 * 1000
  return now - Math.floor(Math.random() * oneYearMs)
}

function makeEvent({ platform, type, title, creator, durationMs }) {
  return {
    id: crypto.randomUUID(),
    platform,
    type,
    timestamp: randomTimestampInPastYear(),
    title,
    creator,
    durationMs,
    extra: {},
  }
}

/** Generates a batch of fake events shaped like real parser output, for
 * developing the stats/dashboard/story-card features before any real
 * exports have been imported. */
export function generateMockEvents(count = 150) {
  const events = []

  for (let i = 0; i < count; i++) {
    const platform = randomItem(['youtube', 'spotify', 'netflix', 'instagram'])

    if (platform === 'youtube') {
      const video = randomItem(YOUTUBE_VIDEOS)
      events.push(
        makeEvent({
          platform,
          type: 'watch',
          ...video,
          durationMs: (2 + Math.random() * 38) * 60 * 1000,
        }),
      )
    } else if (platform === 'spotify') {
      const song = randomItem(SPOTIFY_SONGS)
      events.push(
        makeEvent({
          platform,
          type: 'listen',
          ...song,
          durationMs: (2 + Math.random() * 3) * 60 * 1000,
        }),
      )
    } else if (platform === 'netflix') {
      const show = randomItem(NETFLIX_SHOWS)
      events.push(
        makeEvent({
          platform,
          type: 'watch',
          ...show,
          durationMs: (20 + Math.random() * 50) * 60 * 1000,
        }),
      )
    } else {
      const action = randomItem(INSTAGRAM_ACTIONS)
      events.push(
        makeEvent({
          platform,
          ...action,
          durationMs: null,
        }),
      )
    }
  }

  return events
}
