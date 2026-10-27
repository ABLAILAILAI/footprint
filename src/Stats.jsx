import { useEffect, useRef, useState } from 'react'
import { db } from './db'
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
import BarStat from './charts/BarStat'
import HistogramStat from './charts/HistogramStat'
import LineStat from './charts/LineStat'
import ScatterStat from './charts/ScatterStat'
import './Stats.css'

const TABS = [
  { id: 'activity', label: 'Activity' },
  { id: 'channels', label: 'Channels' },
  { id: 'keywords', label: 'Keywords' },
  { id: 'active-times', label: 'Active times' },
  { id: 'timeline', label: 'Timeline' },
  { id: 'interests', label: 'Interests' },
  { id: 'recommended', label: 'For you' },
]

function Stats({ refreshToken }) {
  const [status, setStatus] = useState('loading') // 'loading' | 'empty' | 'ready' | 'error'
  const [error, setError] = useState(null)
  const [data, setData] = useState(null)
  const [activeTab, setActiveTab] = useState(TABS[0].id)
  const [scrollState, setScrollState] = useState({ left: false, right: false })
  const tabRefs = useRef({})
  const tabsScrollRef = useRef(null)

  function updateScrollState() {
    const el = tabsScrollRef.current
    if (!el) return
    setScrollState({
      left: el.scrollLeft > 4,
      right: el.scrollLeft + el.clientWidth < el.scrollWidth - 4,
    })
  }

  useEffect(() => {
    updateScrollState()
    const el = tabsScrollRef.current
    if (!el) return
    el.addEventListener('scroll', updateScrollState)
    window.addEventListener('resize', updateScrollState)
    return () => {
      el.removeEventListener('scroll', updateScrollState)
      window.removeEventListener('resize', updateScrollState)
    }
  }, [status])

  function selectTab(id) {
    setActiveTab(id)
    tabRefs.current[id]?.scrollIntoView({ behavior: 'smooth', inline: 'nearest', block: 'nearest' })
  }

  function handleTabKeyDown(event, index) {
    let nextIndex = null
    if (event.key === 'ArrowRight') nextIndex = (index + 1) % TABS.length
    else if (event.key === 'ArrowLeft') nextIndex = (index - 1 + TABS.length) % TABS.length
    else if (event.key === 'Home') nextIndex = 0
    else if (event.key === 'End') nextIndex = TABS.length - 1

    if (nextIndex !== null) {
      event.preventDefault()
      const nextTab = TABS[nextIndex]
      selectTab(nextTab.id)
      tabRefs.current[nextTab.id]?.focus()
    }
  }

  useEffect(() => {
    setStatus('loading')
    db.events
      .toArray()
      .then((allEvents) => {
        if (allEvents.length === 0) {
          setStatus('empty')
          return
        }
        // A real export can hold years of history. Stats are scoped to
        // the most recent year so "year in review" reflects an actual
        // recent routine instead of a lifetime average.
        const events = mostRecentYear(allEvents)
        const creators = topCreators(events)
        const interests = categorizeInterests(events)
        setData({
          creators,
          keywords: topSearchKeywords(events),
          timeOfDay: activityByTimeOfDay(events),
          hourly: hourlyHistogram(events),
          interests,
          overTime: activityOverTime(events),
          scatter: eventTimeScatter(events),
          recommendations: recommendationsFor({ interests, creators }),
          olderEventCount: allEvents.length - events.length,
        })
        setStatus('ready')
      })
      .catch((err) => {
        setError(err.message)
        setStatus('error')
      })
  }, [refreshToken])

  if (status === 'loading') {
    return (
      <section className="card">
        <h2>Your interests</h2>
        <p className="status">Loading…</p>
      </section>
    )
  }

  if (status === 'error') {
    return (
      <section className="card">
        <h2>Your interests</h2>
        <p className="error">Couldn't compute stats: {error}</p>
      </section>
    )
  }

  if (status === 'empty') {
    return (
      <section className="card">
        <h2>Your interests</h2>
        <p className="status">
          Import some data or load mock data above to see your stats here.
        </p>
      </section>
    )
  }

  const { creators, keywords, timeOfDay, hourly, interests, overTime, scatter, recommendations, olderEventCount } =
    data
  const maxKeywordCount = keywords[0]?.count ?? 1

  return (
    <section className="card">
      <h2>Your interests</h2>
      {olderEventCount > 0 && (
        <p className="card-hint">
          Showing your most recent year of activity ({olderEventCount} older event
          {olderEventCount === 1 ? '' : 's'} from before that aren't included, so this reflects a
          recent routine instead of a lifetime average).
        </p>
      )}

      <div className="stat-tabs-wrap">
        {scrollState.left && <div className="stat-tabs-fade stat-tabs-fade-left" aria-hidden="true" />}
        <div
          className="stat-tabs"
          role="tablist"
          aria-label="Interest stat categories"
          ref={tabsScrollRef}
        >
          {TABS.map((tab, index) => (
            <button
              key={tab.id}
              ref={(el) => {
                tabRefs.current[tab.id] = el
              }}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              tabIndex={activeTab === tab.id ? 0 : -1}
              className={`stat-tab${activeTab === tab.id ? ' stat-tab-active' : ''}`}
              onClick={() => selectTab(tab.id)}
              onKeyDown={(e) => handleTabKeyDown(e, index)}
            >
              {tab.label}
            </button>
          ))}
        </div>
        {scrollState.right && <div className="stat-tabs-fade stat-tabs-fade-right" aria-hidden="true" />}
      </div>

      {activeTab === 'activity' && (
        <div className="stat-block" role="tabpanel">
          <h3>Activity over the year</h3>
          {overTime.points.length === 0 ? (
            <p className="status">Not enough data yet.</p>
          ) : (
            <>
              <LineStat points={overTime.points} />
              <p className="chart-hint">Drag the handles below the chart to zoom into a date range.</p>
              <p className="stat-analysis">{describeActivityOverTime(overTime)}</p>
            </>
          )}
        </div>
      )}

      {activeTab === 'channels' && (
        <div className="stat-block" role="tabpanel">
          <h3>Top channels</h3>
          {creators.ranked.length === 0 ? (
            <p className="status">
              {creators.missingCreator > 0
                ? "This export format doesn't include channel names, so this can't be shown."
                : 'No watch events yet.'}
            </p>
          ) : (
            <>
              <BarStat items={creators.ranked.map((c) => ({ label: c.creator, count: c.count }))} />
              <p className="stat-analysis">{describeTopChannels(creators)}</p>
            </>
          )}
        </div>
      )}

      {activeTab === 'keywords' && (
        <div className="stat-block" role="tabpanel">
          <h3>Search keyword cloud</h3>
          {keywords.length === 0 ? (
            <p className="status">No search events yet.</p>
          ) : (
            <>
              <div className="word-cloud">
                {keywords.map(({ word, count }) => (
                  <span
                    key={word}
                    className="word-cloud-word"
                    style={{ fontSize: `${0.8 + (count / maxKeywordCount) * 1.4}rem` }}
                  >
                    {word}
                  </span>
                ))}
              </div>
              <p className="stat-analysis">{describeTopKeywords(keywords)}</p>
            </>
          )}
        </div>
      )}

      {activeTab === 'active-times' && (
        <div className="stat-block" role="tabpanel">
          <h3>When you're most active</h3>
          {timeOfDay.topLabel === null ? (
            <p className="status">Not enough data yet.</p>
          ) : (
            <>
              <HistogramStat items={hourly} />
              <p className="stat-analysis">
                You're a <strong>{timeOfDay.topLabel}</strong> — {timeOfDay.topPercent}% of your
                activity falls in that part of the day.
              </p>
            </>
          )}
        </div>
      )}

      {activeTab === 'timeline' && (
        <div className="stat-block" role="tabpanel">
          <h3>When during the day, across the year</h3>
          {scatter.points.length === 0 ? (
            <p className="status">Not enough data yet.</p>
          ) : (
            <>
              <ScatterStat points={scatter.points} />
              <p className="stat-analysis">
                Each dot is one event, plotted by date and time of day
                {scatter.sampled && ` (a sample of ${scatter.points.length} out of ${scatter.totalCount}, so the chart stays fast)`}
                . Look for clusters — they show your real habits better than any single number.
              </p>
            </>
          )}
        </div>
      )}

      {activeTab === 'interests' && (
        <div className="stat-block" role="tabpanel">
          <h3>Rough interest categories</h3>
          <p className="card-hint">
            A simple keyword heuristic Claude wrote — not backed by any research, just
            pattern-matching on titles. Take it as a rough guess, not a real analysis.
          </p>
          {interests.ranked.length === 0 ? (
            <p className="status">Not enough data yet.</p>
          ) : (
            <>
              <BarStat items={interests.ranked.map((c) => ({ label: c.label, count: c.count }))} />
              <p className="stat-analysis">{describeInterests(interests)}</p>
            </>
          )}
        </div>
      )}

      {activeTab === 'recommended' && (
        <div className="stat-block" role="tabpanel">
          <h3>Recommended for you</h3>
          <p className="card-hint">
            A short, hand-picked list for your top categories — not a real recommendation
            algorithm (there's no backend to power one without sending your data somewhere),
            just names people into that category commonly enjoy.
          </p>
          {recommendations.length === 0 ? (
            <p className="status">Not enough data yet.</p>
          ) : (
            recommendations.map(({ category, suggestions }) => (
              <div className="recommend-group" key={category}>
                <p className="recommend-category">
                  Because you're into <strong>{category}</strong>
                </p>
                <div className="recommend-chips">
                  {suggestions.map((name) => (
                    <span className="recommend-chip" key={name}>
                      {name}
                    </span>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </section>
  )
}

export default Stats
