import JSZip from 'jszip'
import { describe, expect, it } from 'vitest'
import { detectPlatform } from './detectPlatform'

function textFile(name, content = '{}') {
  return new File([content], name, { type: 'text/plain' })
}

async function zipFile(name, entryNames) {
  const zip = new JSZip()
  for (const entryName of entryNames) {
    zip.file(entryName, '{}')
  }
  const blob = await zip.generateAsync({ type: 'blob' })
  return new File([blob], name, { type: 'application/zip' })
}

describe('detectPlatform', () => {
  it('recognizes a standalone YouTube watch-history.json', async () => {
    expect(await detectPlatform(textFile('watch-history.json'))).toBe('youtube')
  })

  it('recognizes a standalone Netflix ViewingActivity.csv', async () => {
    expect(await detectPlatform(textFile('ViewingActivity.csv'))).toBe('netflix')
  })

  it('recognizes a Spotify export inside a zip', async () => {
    const file = await zipFile('my_spotify_data.zip', [
      'MyData/StreamingHistory_music_0.json',
    ])
    expect(await detectPlatform(file)).toBe('spotify')
  })

  it('recognizes an Instagram export inside a zip', async () => {
    const file = await zipFile('instagram-haoran.zip', [
      'your_instagram_activity/likes/liked_posts.json',
    ])
    expect(await detectPlatform(file)).toBe('instagram')
  })

  it('recognizes a YouTube Takeout zip even when buried in folders', async () => {
    const file = await zipFile('takeout.zip', [
      'Takeout/YouTube and YouTube Music/history/watch-history.json',
    ])
    expect(await detectPlatform(file)).toBe('youtube')
  })

  it('returns null for a file that matches no platform', async () => {
    expect(await detectPlatform(textFile('vacation-photo.jpg'))).toBeNull()
  })

  it('returns null for a zip whose contents match no platform', async () => {
    const file = await zipFile('random.zip', ['notes.txt', 'photo.png'])
    expect(await detectPlatform(file)).toBeNull()
  })
})
