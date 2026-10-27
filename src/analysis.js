// Descriptive statistics computed purely from the unified event format —
// never raw platform data — so these work the same regardless of which
// platform an event came from. Everything here is plain counting and
// sorting, not machine learning or anything backed by personality-
// prediction research; see the "Rough interest categories" labeling in
// the UI for why that distinction matters.

const STOPWORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'of', 'to', 'in', 'on', 'for',
  'with', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'how', 'what',
  'why', 'when', 'where', 'who', 'which', 'this', 'that', 'these', 'those',
  'it', 'its', 'as', 'at', 'by', 'from', 'do', 'does', 'did', 'can',
  'could', 'will', 'would', 'should', 'i', 'you', 'your', 'me', 'my',
])

/** Ranks creators (channels/artists/shows) by how many "watch" events
 * they appear in. Some export formats (notably YouTube's HTML export)
 * never include creator info, so this also reports how many watch
 * events had no creator to count, rather than silently ignoring them.
 * Also reports the full distinct-channel count and total watch events
 * with a creator, so callers can describe a share like "40% of your
 * watch history" without re-deriving it from a list that's been
 * truncated to `limit`. */
export function topCreators(events, { limit = 10 } = {}) {
  const counts = new Map()
  let missingCreator = 0

  for (const event of events) {
    if (event.type !== 'watch') continue
    if (!event.creator) {
      missingCreator++
      continue
    }
    counts.set(event.creator, (counts.get(event.creator) ?? 0) + 1)
  }

  const allRanked = [...counts.entries()].sort((a, b) => b[1] - a[1])
  const ranked = allRanked.slice(0, limit).map(([creator, count]) => ({ creator, count }))
  const totalWithCreator = allRanked.reduce((sum, [, count]) => sum + count, 0)

  return { ranked, missingCreator, totalWithCreator, distinctCount: allRanked.length }
}

/** Counts word frequency across "search" event titles, for a keyword
 * word-cloud. Filters common stopwords and very short words so the
 * result is dominated by meaningful terms, not "the"/"how"/"a". */
export function topSearchKeywords(events, { limit = 20 } = {}) {
  const counts = new Map()

  for (const event of events) {
    if (event.type !== 'search') continue
    const words = event.title.toLowerCase().match(/[a-z0-9']+/g) ?? []
    for (const word of words) {
      if (word.length < 3 || STOPWORDS.has(word)) continue
      counts.set(word, (counts.get(word) ?? 0) + 1)
    }
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([word, count]) => ({ word, count }))
}

/** Turns a topSearchKeywords() result into a plain-English sentence
 * naming the most common search term, or null if there's nothing to
 * describe yet. */
export function describeTopKeywords(keywords) {
  if (keywords.length === 0) return null
  const top = keywords[0]
  const timeWord = top.count === 1 ? 'time' : 'times'
  let sentence = `"${top.word}" is your most common search term, appearing ${top.count} ${timeWord}`
  if (keywords.length > 1) {
    sentence += `, ahead of "${keywords[1].word}" in second place`
  }
  return `${sentence}.`
}

const TIME_BUCKETS = [
  { label: 'Night Owl', hours: [22, 23, 0, 1, 2, 3, 4] },
  { label: 'Morning Person', hours: [5, 6, 7, 8, 9, 10, 11] },
  { label: 'Afternoon', hours: [12, 13, 14, 15, 16] },
  { label: 'Evening', hours: [17, 18, 19, 20, 21] },
]

/** Buckets events into which part of the day they happened, and
 * returns both the raw counts and which bucket had the most activity
 * (or null if there's no data yet). */
export function activityByTimeOfDay(events) {
  const counts = Object.fromEntries(TIME_BUCKETS.map((b) => [b.label, 0]))
  const hourOf = (event) => new Date(event.timestamp).getHours()

  for (const event of events) {
    const hour = hourOf(event)
    const bucket = TIME_BUCKETS.find((b) => b.hours.includes(hour))
    if (bucket) counts[bucket.label]++
  }

  const total = events.length
  let topLabel = null
  let topCount = 0
  for (const [label, count] of Object.entries(counts)) {
    if (count > topCount) {
      topLabel = label
      topCount = count
    }
  }

  return {
    counts,
    total,
    topLabel,
    topPercent: total > 0 ? Math.round((topCount / total) * 100) : 0,
  }
}

const INTEREST_CATEGORIES = [
  {
    label: 'Gaming',
    keywords: ['gameplay', 'gaming', 'playthrough', 'speedrun', 'walkthrough', "let's play", 'boss fight'],
  },
  {
    label: 'Education & Tutorials',
    keywords: ['tutorial', 'how to', 'explained', 'lecture', 'course', 'crash course', 'documentary'],
  },
  {
    label: 'Technology',
    keywords: ['review', 'unboxing', 'coding', 'programming', 'software', 'app', 'ai ', 'tech '],
  },
  {
    label: 'Sports',
    keywords: ['highlights', ' vs ', 'vs.', 'game recap', 'full game', 'championship', 'playoffs', 'press conference'],
  },
  {
    label: 'Music',
    keywords: [
      'official video', 'official audio', 'official music video', 'lyrics', 'album', 'remix',
      'live performance', 'acoustic', 'music video',
    ],
  },
  {
    label: 'News & Politics',
    keywords: ['news', 'breaking', 'politics', 'election'],
  },
  {
    label: 'Comedy & Entertainment',
    keywords: ['funny', 'prank', 'comedy', 'vlog', 'reaction'],
  },
]

// Some platforms carry no useful title text to keyword-match against —
// a Spotify song title tells you nothing about genre, for instance —
// but the platform itself already tells us the real category with more
// confidence than guessing from the title would. Used only when no
// keyword match was found, so a YouTube video that happens to be about
// music still gets tagged Music by its title. Deliberately has no entry
// for Instagram: likes/comments/follows are interactions, not content
// consumed, so they're excluded below rather than mapped to a guessed
// "Social Media" interest.
const PLATFORM_FALLBACK = {
  spotify: 'Music',
  netflix: 'TV & Movies',
}

// The event types that represent actually consuming content (as
// opposed to an interaction like a like/comment/follow), and so count
// toward an "interest". Spotify's events are "listen", not "watch".
const CONTENT_TYPES = new Set(['watch', 'search', 'listen'])

const GENERAL_LABEL = 'General'

/** A simple keyword-matching heuristic over watched/searched/listened
 * titles — not backed by any personality or interest-prediction
 * research, just pattern matching Claude wrote. Falls back to the
 * platform itself (see PLATFORM_FALLBACK) when the title has no useful
 * keywords to match, and only truly unclassifiable events land in
 * "General". */
export function categorizeInterests(events) {
  const labels = [...INTEREST_CATEGORIES.map((c) => c.label), ...Object.values(PLATFORM_FALLBACK), GENERAL_LABEL]
  const counts = new Map(labels.map((label) => [label, 0]))
  let consideredTotal = 0

  for (const event of events) {
    if (!CONTENT_TYPES.has(event.type)) continue
    consideredTotal++
    const text = event.title.toLowerCase()
    const match = INTEREST_CATEGORIES.find((c) => c.keywords.some((k) => text.includes(k)))
    const label = match?.label ?? PLATFORM_FALLBACK[event.platform] ?? GENERAL_LABEL
    counts.set(label, counts.get(label) + 1)
  }

  const ranked = [...counts.entries()]
    .filter(([, count]) => count > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([label, count]) => ({ label, count }))

  return { ranked, consideredTotal }
}

// A short, hand-picked list per category — not personalized or backed
// by any recommendation algorithm, just well-known names people into
// that category commonly enjoy. There's no backend here to generate
// real recommendations without sending someone's data off their
// device, so this is the honest alternative: a static list, labeled as
// exactly that in the UI. No entry for "General" — it's a catch-all,
// not a real taste, so there's nothing sensible to recommend from it.
const RECOMMENDATIONS = {
  Gaming: ['PewDiePie', 'Markiplier', 'Summoning Salt', 'Dream', 'jacksepticeye'],
  'Education & Tutorials': ['CrashCourse', 'Veritasium', '3Blue1Brown', 'Khan Academy', 'TED-Ed'],
  Technology: ['MKBHD', 'Linus Tech Tips', 'Fireship', 'ThePrimeagen', 'Two Minute Papers'],
  Sports: ['ESPN', 'Bleacher Report', 'NFL', 'Big Ten Network', 'SEC Network'],
  Music: ['The Weeknd', 'Harry Styles', 'Billie Eilish', 'Tame Impala', 'Dua Lipa'],
  'News & Politics': ['NPR', 'PBS NewsHour', 'Vox', 'AP', 'Reuters'],
  'Comedy & Entertainment': ['Saturday Night Live', 'Dry Bar Comedy', 'Key & Peele', 'CollegeHumor', 'Jimmy Fallon'],
  'TV & Movies': ['A24', 'Pitch Meeting', 'Screen Rant', 'Netflix Is a Joke', 'Fandango'],
}

/** Suggests a few channels/artists/shows for each of the viewer's top
 * couple of interest categories, skipping anything they already watch
 * (per topCreators()) so it doesn't recommend something they already
 * know. Takes the already-computed categorizeInterests() and
 * topCreators() results rather than raw events, since callers already
 * have both on hand. */
export function recommendationsFor({ interests, creators, topCategories = 2, limit = 4 }) {
  const alreadyKnown = new Set(creators.ranked.map((c) => c.creator.toLowerCase()))

  return interests.ranked
    .filter((r) => r.label !== GENERAL_LABEL && RECOMMENDATIONS[r.label])
    .slice(0, topCategories)
    .map(({ label }) => ({
      category: label,
      suggestions: RECOMMENDATIONS[label].filter((name) => !alreadyKnown.has(name.toLowerCase())).slice(0, limit),
    }))
    .filter((entry) => entry.suggestions.length > 0)
}

/** Turns a topCreators() result into a plain-English sentence describing
 * the top channel's share of watch history, or null if there's nothing
 * to describe yet. */
export function describeTopChannels({ ranked, totalWithCreator, distinctCount }) {
  if (ranked.length === 0) return null
  const top = ranked[0]
  const topShare = Math.round((top.count / totalWithCreator) * 100)
  const channelWord = distinctCount === 1 ? 'channel' : 'channels'
  let sentence = `You watched content from ${distinctCount} different ${channelWord}. ${top.creator} leads with ${topShare}% of your watch history`
  if (ranked.length > 1) {
    sentence += `, ahead of ${ranked[1].creator} in second place`
  }
  return `${sentence}.`
}

/** Turns a categorizeInterests() result into a plain-English sentence
 * describing the top one or two categories' share, or null if there's
 * nothing to describe yet. */
export function describeInterests({ ranked, consideredTotal }) {
  if (ranked.length === 0 || consideredTotal === 0) return null
  const top = ranked[0]
  const topShare = Math.round((top.count / consideredTotal) * 100)
  let sentence = `${top.label} makes up ${topShare}% of what you watched and searched for`
  if (ranked.length > 1) {
    const second = ranked[1]
    const secondShare = Math.round((second.count / consideredTotal) * 100)
    sentence += `, with ${second.label} next at ${secondShare}%`
  }
  return `${sentence}.`
}

const HOUR_LABELS = [
  '12am', '1am', '2am', '3am', '4am', '5am', '6am', '7am', '8am', '9am', '10am', '11am',
  '12pm', '1pm', '2pm', '3pm', '4pm', '5pm', '6pm', '7pm', '8pm', '9pm', '10pm', '11pm',
]

/** A true histogram of activity by hour of day (24 bins), for a more
 * granular companion to activityByTimeOfDay()'s four broad buckets. */
export function hourlyHistogram(events) {
  const counts = new Array(24).fill(0)
  for (const event of events) {
    counts[new Date(event.timestamp).getHours()]++
  }
  return counts.map((count, hour) => ({ hour, label: HOUR_LABELS[hour], count }))
}

const DAY_MS = 24 * 60 * 60 * 1000
const MONTH_ABBR = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
]

function dayKey(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function startOfWeek(date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  const sinceMonday = (d.getDay() + 6) % 7
  d.setDate(d.getDate() - sinceMonday)
  return d
}

function formatDateLabel(key, unit) {
  const [, m, d] = key.split('-').map(Number)
  const label = `${MONTH_ABBR[m - 1]} ${d}`
  return unit === 'week' ? `Week of ${label}` : label
}

/** Buckets every event into a chronological day-by-day or week-by-week
 * count (picking weeks once the date range is long enough that daily
 * bars would be too thin to read), filling gaps with zero so a line
 * chart doesn't skip over quiet stretches. Returns points in order,
 * plus which single bucket had the most activity. */
export function activityOverTime(events) {
  if (events.length === 0) {
    return { points: [], unit: 'day', busiest: null, rangeDays: 0 }
  }

  const timestamps = events.map((e) => e.timestamp).sort((a, b) => a - b)
  const minDate = new Date(timestamps[0])
  const maxDate = new Date(timestamps[timestamps.length - 1])
  const rangeDays = Math.max(1, Math.round((maxDate - minDate) / DAY_MS))
  const unit = rangeDays <= 90 ? 'day' : 'week'

  const counts = new Map()
  if (unit === 'day') {
    for (let t = new Date(minDate); t <= maxDate; t.setDate(t.getDate() + 1)) {
      counts.set(dayKey(t), 0)
    }
    for (const event of events) {
      const key = dayKey(new Date(event.timestamp))
      counts.set(key, (counts.get(key) ?? 0) + 1)
    }
  } else {
    const end = startOfWeek(maxDate)
    // Steps via setDate (local, DST-aware) rather than adding
    // 7 * DAY_MS — raw millisecond arithmetic drifts by an hour across
    // a daylight-saving transition, which shifts the computed calendar
    // day by one and splits a single week into two bogus buckets.
    for (let t = startOfWeek(minDate); t <= end; t.setDate(t.getDate() + 7)) {
      counts.set(dayKey(t), 0)
    }
    for (const event of events) {
      const key = dayKey(startOfWeek(new Date(event.timestamp)))
      counts.set(key, (counts.get(key) ?? 0) + 1)
    }
  }

  const points = [...counts.entries()]
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([date, count]) => ({ date, label: formatDateLabel(date, unit), count }))

  let busiest = points[0]
  for (const point of points) {
    if (point.count > busiest.count) busiest = point
  }

  return { points, unit, busiest, rangeDays }
}

/** Turns an activityOverTime() result into a plain-English sentence
 * naming the date range and the single busiest bucket, or null if
 * there's nothing to describe yet. */
export function describeActivityOverTime({ points, unit, busiest, rangeDays }) {
  if (points.length === 0 || !busiest) return null
  const span = unit === 'week' ? `${points.length} weeks` : `${rangeDays} days`
  const unitWord = unit === 'week' ? 'week' : 'day'
  return `Your activity spans ${span}, from ${points[0].label} to ${points[points.length - 1].label}. Your busiest ${unitWord} was ${busiest.label}, with ${busiest.count} events.`
}

/** One point per event (date × hour of day), for a scatter plot of when
 * activity actually happens across the year. Large datasets are
 * downsampled to maxPoints — evenly across the full chronological
 * range, not just the first N — so the chart stays responsive, with
 * `sampled` reported so the UI can say so. */
export function eventTimeScatter(events, { maxPoints = 1200 } = {}) {
  if (events.length === 0) return { points: [], sampled: false, totalCount: 0 }

  const sorted = [...events].sort((a, b) => a.timestamp - b.timestamp)
  const sampled = sorted.length > maxPoints
  const chosen = sampled
    ? Array.from({ length: maxPoints }, (_, i) => sorted[Math.floor((i * sorted.length) / maxPoints)])
    : sorted

  const points = chosen.map((event) => {
    const date = new Date(event.timestamp)
    return {
      timestamp: event.timestamp,
      hour: date.getHours() + date.getMinutes() / 60,
      dateLabel: formatDateLabel(dayKey(date), 'day'),
    }
  })

  return { points, sampled, totalCount: sorted.length }
}
