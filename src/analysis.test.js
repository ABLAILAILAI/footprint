import { describe, expect, it } from 'vitest'
import {
  activityByTimeOfDay,
  activityOverTime,
  categorizeInterests,
  describeActivityOverTime,
  describeInterests,
  describeTopChannels,
  describeTopKeywords,
  eventTimeScatter,
  hourlyHistogram,
  mostRecentYear,
  recommendationsFor,
  topCreators,
  topSearchKeywords,
} from './analysis'

function event(overrides) {
  return {
    id: crypto.randomUUID(),
    platform: 'youtube',
    type: 'watch',
    timestamp: Date.now(),
    title: 'Untitled',
    creator: null,
    durationMs: null,
    extra: {},
    ...overrides,
  }
}

describe('mostRecentYear', () => {
  it('keeps only events within a year of the newest one, not of "now"', () => {
    const newest = new Date(2026, 0, 1).getTime()
    const events = [
      event({ timestamp: newest }),
      event({ timestamp: newest - 100 * 24 * 60 * 60 * 1000 }), // 100 days earlier — kept
      event({ timestamp: newest - 400 * 24 * 60 * 60 * 1000 }), // 400 days earlier — dropped
    ]
    const result = mostRecentYear(events)
    expect(result).toHaveLength(2)
    expect(result.every((e) => e.timestamp >= newest - 365 * 24 * 60 * 60 * 1000)).toBe(true)
  })

  it('returns an empty array unchanged instead of crashing', () => {
    expect(mostRecentYear([])).toEqual([])
  })
})

describe('topCreators', () => {
  it('ranks creators by watch count and ignores non-watch events', () => {
    const events = [
      event({ creator: 'Alice', type: 'watch' }),
      event({ creator: 'Alice', type: 'watch' }),
      event({ creator: 'Bob', type: 'watch' }),
      event({ creator: 'Alice', type: 'search' }), // not a watch, shouldn't count
    ]
    const { ranked, missingCreator } = topCreators(events)
    expect(ranked).toEqual([
      { creator: 'Alice', count: 2 },
      { creator: 'Bob', count: 1 },
    ])
    expect(missingCreator).toBe(0)
  })

  it('counts watch events with no creator separately instead of ignoring them', () => {
    const events = [event({ creator: null, type: 'watch' }), event({ creator: null, type: 'watch' })]
    const { ranked, missingCreator } = topCreators(events)
    expect(ranked).toEqual([])
    expect(missingCreator).toBe(2)
  })

  it('reports the full distinct-channel count and total even when the list is truncated', () => {
    const events = [
      event({ creator: 'Alice', type: 'watch' }),
      event({ creator: 'Alice', type: 'watch' }),
      event({ creator: 'Bob', type: 'watch' }),
      event({ creator: 'Carol', type: 'watch' }),
    ]
    const { ranked, totalWithCreator, distinctCount } = topCreators(events, { limit: 2 })
    expect(ranked).toHaveLength(2) // truncated to the limit
    expect(distinctCount).toBe(3) // but the real count of channels isn't lost
    expect(totalWithCreator).toBe(4) // nor is the real total watch count
  })
})

describe('topSearchKeywords', () => {
  it('counts meaningful words and filters stopwords/short words', () => {
    const events = [
      event({ type: 'search', title: 'how to build a cpu' }),
      event({ type: 'search', title: 'how to build a computer' }),
      event({ type: 'watch', title: 'build a cpu video' }), // not a search, excluded
    ]
    const result = topSearchKeywords(events)
    const words = result.map((r) => r.word)
    expect(words).toContain('build')
    expect(words).toContain('cpu')
    expect(words).not.toContain('how') // stopword
    expect(words).not.toContain('to') // stopword
    expect(words).not.toContain('a') // too short

    const build = result.find((r) => r.word === 'build')
    expect(build.count).toBe(2)
  })
})

describe('describeTopKeywords', () => {
  it('names the top search term and mentions the runner-up', () => {
    const sentence = describeTopKeywords([
      { word: 'tarkov', count: 5 },
      { word: 'csgo', count: 2 },
    ])
    expect(sentence).toBe(
      '"tarkov" is your most common search term, appearing 5 times, ahead of "csgo" in second place.',
    )
  })

  it('uses singular "time" for a count of exactly one', () => {
    const sentence = describeTopKeywords([{ word: 'solo', count: 1 }])
    expect(sentence).toBe('"solo" is your most common search term, appearing 1 time.')
  })

  it('returns null when there is nothing to describe', () => {
    expect(describeTopKeywords([])).toBeNull()
  })
})

describe('activityByTimeOfDay', () => {
  it('buckets events by hour and finds the dominant time of day', () => {
    function atHour(hour) {
      const d = new Date(2026, 0, 1, hour, 0, 0)
      return event({ timestamp: d.getTime() })
    }
    const events = [atHour(23), atHour(1), atHour(2), atHour(14)] // 3 night, 1 afternoon
    const result = activityByTimeOfDay(events)
    expect(result.topLabel).toBe('Night Owl')
    expect(result.topPercent).toBe(75)
  })

  it('returns null topLabel for no events instead of a misleading default', () => {
    expect(activityByTimeOfDay([]).topLabel).toBeNull()
  })
})

describe('describeTopChannels', () => {
  it('names the top channel and its share, and mentions second place', () => {
    const sentence = describeTopChannels({
      ranked: [
        { creator: 'Alice', count: 3 },
        { creator: 'Bob', count: 1 },
      ],
      totalWithCreator: 4,
      distinctCount: 2,
    })
    expect(sentence).toBe(
      'You watched content from 2 different channels. Alice leads with 75% of your watch history, ahead of Bob in second place.',
    )
  })

  it('returns null when there is nothing to describe', () => {
    expect(describeTopChannels({ ranked: [], totalWithCreator: 0, distinctCount: 0 })).toBeNull()
  })
})

describe('describeInterests', () => {
  it('names the top category and its share, and mentions the runner-up', () => {
    const sentence = describeInterests({
      ranked: [
        { label: 'Gaming', count: 3 },
        { label: 'Music', count: 1 },
      ],
      consideredTotal: 4,
    })
    expect(sentence).toBe('Gaming makes up 75% of what you watched and searched for, with Music next at 25%.')
  })

  it('returns null when there is nothing to describe', () => {
    expect(describeInterests({ ranked: [], consideredTotal: 0 })).toBeNull()
  })
})

describe('hourlyHistogram', () => {
  it('bins events into 24 hourly buckets', () => {
    function atHour(hour) {
      return event({ timestamp: new Date(2026, 0, 1, hour, 0, 0).getTime() })
    }
    const result = hourlyHistogram([atHour(9), atHour(9), atHour(21)])
    expect(result).toHaveLength(24)
    expect(result[9]).toEqual({ hour: 9, label: '9am', count: 2 })
    expect(result[21]).toEqual({ hour: 21, label: '9pm', count: 1 })
    expect(result[0]).toEqual({ hour: 0, label: '12am', count: 0 })
  })
})

describe('activityOverTime', () => {
  function onDay(day) {
    return event({ timestamp: new Date(2026, 0, day, 12, 0, 0).getTime() })
  }

  it('buckets by day and fills gaps with zero when the range is short', () => {
    const events = [onDay(1), onDay(1), onDay(3)] // day 2 is a gap
    const { points, unit, busiest, rangeDays } = activityOverTime(events)
    expect(unit).toBe('day')
    expect(rangeDays).toBe(2)
    expect(points.map((p) => p.count)).toEqual([2, 0, 1])
    expect(busiest.count).toBe(2)
  })

  it('returns an empty, non-crashing result for no events', () => {
    expect(activityOverTime([])).toEqual({ points: [], unit: 'day', busiest: null, rangeDays: 0 })
  })

  it('switches to weekly buckets once the range is long', () => {
    const events = [
      event({ timestamp: new Date(2026, 0, 1).getTime() }),
      event({ timestamp: new Date(2026, 5, 1).getTime() }), // ~5 months later
    ]
    expect(activityOverTime(events).unit).toBe('week')
  })

  it('keeps weekly buckets exactly 7 days apart across a DST transition', () => {
    // US clocks "fall back" on the first Sunday of November. Stepping
    // the weekly loop by raw milliseconds instead of calendar days used
    // to drift an hour across this boundary, which shifted a bucket's
    // computed calendar day by one and split a single week into two —
    // this is a regression test for that bug.
    const events = [
      event({ timestamp: new Date(2025, 9, 1, 12).getTime() }), // Oct 1, 2025
      event({ timestamp: new Date(2025, 9, 1, 12).getTime() + 1 }),
      event({ timestamp: new Date(2026, 1, 1, 12).getTime() }), // Feb 1, 2026 — long enough
    ]                                                           // range to force weekly buckets,
                                                                  // and still crosses DST ending
    const { points, unit } = activityOverTime(events)
    expect(unit).toBe('week')

    for (let i = 1; i < points.length; i++) {
      const prev = new Date(points[i - 1].date)
      const curr = new Date(points[i].date)
      const diffDays = Math.round((curr - prev) / (24 * 60 * 60 * 1000))
      expect(diffDays).toBe(7) // every bucket should be exactly one week after the last
    }
  })
})

describe('describeActivityOverTime', () => {
  it('describes the date range and busiest bucket', () => {
    const result = activityOverTime([
      event({ timestamp: new Date(2026, 0, 1, 12).getTime() }),
      event({ timestamp: new Date(2026, 0, 1, 13).getTime() }),
      event({ timestamp: new Date(2026, 0, 2, 12).getTime() }),
    ])
    expect(describeActivityOverTime(result)).toBe(
      'Your activity spans 1 days, from Jan 1 to Jan 2. Your busiest day was Jan 1, with 2 events.',
    )
  })

  it('returns null when there is nothing to describe', () => {
    expect(describeActivityOverTime({ points: [], unit: 'day', busiest: null, rangeDays: 0 })).toBeNull()
  })
})

describe('eventTimeScatter', () => {
  it('returns one point per event with hour and date label when under the cap', () => {
    const events = [event({ timestamp: new Date(2026, 0, 1, 14, 30).getTime() })]
    const { points, sampled, totalCount } = eventTimeScatter(events)
    expect(sampled).toBe(false)
    expect(totalCount).toBe(1)
    expect(points).toHaveLength(1)
    expect(points[0].hour).toBe(14.5)
    expect(points[0].dateLabel).toBe('Jan 1')
  })

  it('downsamples to maxPoints instead of returning everything', () => {
    const events = Array.from({ length: 500 }, (_, i) =>
      event({ timestamp: new Date(2026, 0, 1).getTime() + i * 60000 }),
    )
    const { points, sampled, totalCount } = eventTimeScatter(events, { maxPoints: 100 })
    expect(sampled).toBe(true)
    expect(totalCount).toBe(500)
    expect(points).toHaveLength(100)
  })
})

describe('categorizeInterests', () => {
  it('matches titles to categories by keyword and buckets the rest as General', () => {
    const events = [
      event({ type: 'watch', title: 'Speedrun World Record Reaction' }),
      event({ type: 'watch', title: 'React useEffect Tutorial' }),
      event({ type: 'watch', title: 'Just a regular vacation photo slideshow' }),
    ]
    const { ranked, consideredTotal } = categorizeInterests(events)
    expect(consideredTotal).toBe(3)
    expect(ranked.find((r) => r.label === 'Gaming').count).toBe(1)
    expect(ranked.find((r) => r.label === 'Education & Tutorials').count).toBe(1)
    expect(ranked.find((r) => r.label === 'General').count).toBe(1)
  })

  it('falls back to the platform for titles with no useful keywords, instead of General', () => {
    const events = [
      event({ platform: 'spotify', type: 'listen', title: 'Blinding Lights' }),
      event({ platform: 'netflix', type: 'watch', title: 'Stranger Things' }),
    ]
    const { ranked } = categorizeInterests(events)
    expect(ranked.find((r) => r.label === 'Music').count).toBe(1)
    expect(ranked.find((r) => r.label === 'TV & Movies').count).toBe(1)
    expect(ranked.find((r) => r.label === 'General')).toBeUndefined()
  })

  it('excludes Instagram-style interactions (like/comment/follow) rather than guessing an interest', () => {
    const events = [
      event({ platform: 'instagram', type: 'like', title: 'Liked a post from a friend' }),
      event({ platform: 'instagram', type: 'comment', title: 'Commented "congrats!!"' }),
      event({ platform: 'instagram', type: 'follow', title: 'Started following a new account' }),
    ]
    const { ranked, consideredTotal } = categorizeInterests(events)
    expect(consideredTotal).toBe(0)
    expect(ranked).toEqual([])
  })

  it('still prefers a keyword match over the platform fallback', () => {
    // A YouTube video that happens to be about music should be tagged
    // Music by its title, not fall through to a platform default
    // (YouTube has no platform fallback at all, but this also guards
    // against the match-order flipping for a platform that did).
    const events = [event({ platform: 'youtube', type: 'watch', title: 'Official Music Video' })]
    const { ranked } = categorizeInterests(events)
    expect(ranked.find((r) => r.label === 'Music').count).toBe(1)
  })
})

describe('recommendationsFor', () => {
  it('suggests names for the top categories, skipping General', () => {
    const interests = {
      ranked: [
        { label: 'Gaming', count: 10 },
        { label: 'General', count: 8 },
        { label: 'Music', count: 5 },
      ],
      consideredTotal: 23,
    }
    const creators = { ranked: [], missingCreator: 0, totalWithCreator: 0, distinctCount: 0 }
    const result = recommendationsFor({ interests, creators })
    expect(result.map((r) => r.category)).toEqual(['Gaming', 'Music']) // top 2, General skipped
    expect(result[0].suggestions.length).toBeGreaterThan(0)
  })

  it('does not suggest a channel the viewer already watches', () => {
    const interests = { ranked: [{ label: 'Gaming', count: 10 }], consideredTotal: 10 }
    const creators = {
      ranked: [{ creator: 'PewDiePie', count: 5 }],
      missingCreator: 0,
      totalWithCreator: 5,
      distinctCount: 1,
    }
    const result = recommendationsFor({ interests, creators })
    expect(result[0].suggestions).not.toContain('PewDiePie')
  })

  it('omits a category entirely once all of its suggestions are already known', () => {
    const interests = { ranked: [{ label: 'Gaming', count: 10 }], consideredTotal: 10 }
    const creators = {
      ranked: ['PewDiePie', 'Markiplier', 'Summoning Salt', 'Dream', 'jacksepticeye'].map((creator) => ({
        creator,
        count: 1,
      })),
      missingCreator: 0,
      totalWithCreator: 5,
      distinctCount: 5,
    }
    expect(recommendationsFor({ interests, creators })).toEqual([])
  })

  it('returns nothing when the only category is one with no curated list', () => {
    const interests = { ranked: [{ label: 'General', count: 10 }], consideredTotal: 10 }
    const creators = { ranked: [], missingCreator: 0, totalWithCreator: 0, distinctCount: 0 }
    expect(recommendationsFor({ interests, creators })).toEqual([])
  })
})
