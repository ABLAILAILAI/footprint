import JSZip from 'jszip'

// Each platform's export has recognizable file names, whether the file
// arrives standalone or inside a zip. These patterns are deliberately
// loose (platforms change their export format over time) — getting a
// false "unrecognized" is safer than silently matching the wrong platform.
//
// YouTube matches both .json and .html: Google defaults to HTML for
// history exports and only uses JSON if you explicitly ask for it in
// the export settings, so a real-world app has to handle both.
const SIGNATURES = [
  { platform: 'youtube', pattern: /(watch|search)-history\.(json|html)$/i },
  { platform: 'spotify', pattern: /streaming_?history.*\.json$/i },
  { platform: 'netflix', pattern: /(viewingactivity|netflixviewinghistory)\.csv$/i },
  { platform: 'instagram', pattern: /your_instagram_activity|personal_information\.json$/i },
]

function matchName(name) {
  const match = SIGNATURES.find(({ pattern }) => pattern.test(name))
  return match ? match.platform : null
}

function getFormat(name) {
  return name.slice(name.lastIndexOf('.') + 1).toLowerCase()
}

async function locateInZip(file) {
  const zip = await JSZip.loadAsync(file)
  for (const entryName of Object.keys(zip.files)) {
    const platform = matchName(entryName)
    if (platform) {
      const text = await zip.files[entryName].async('string')
      return { platform, format: getFormat(entryName), text }
    }
  }
  return null
}

/** Looks at a dropped/selected file's name (and, for zips, the names of
 * the files inside it) and returns which platform and format it looks
 * like an export from, plus the raw text of whichever file matched — so
 * a parser can turn it into real events. Returns null if nothing matched. */
export async function locatePlatformSource(file) {
  const directMatch = matchName(file.name)
  if (directMatch) {
    return { platform: directMatch, format: getFormat(file.name), text: await file.text() }
  }

  if (file.name.toLowerCase().endsWith('.zip')) {
    return await locateInZip(file)
  }

  return null
}

/** Same as locatePlatformSource, but just the platform name — for
 * callers that only need to know what a file is, not read it. */
export async function detectPlatform(file) {
  const result = await locatePlatformSource(file)
  return result ? result.platform : null
}
