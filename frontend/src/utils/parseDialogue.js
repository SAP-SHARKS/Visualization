/**
 * Parse raw dialogue text and return structured data for visualization.
 *
 * Expects lines like:
 *   Speaker Name [timestamp]: dialogue text
 *   Speaker Name: dialogue text
 *
 * Returns { lines, total_lines, total_words, speakers, exchanges }
 */
export default function parseDialogue(text) {
  const lines = []
  const speakers = {}
  let totalWords = 0

  for (const rawLine of text.split('\n')) {
    const trimmed = rawLine.trim()
    if (!trimmed) continue

    // Match "Speaker [0:12]: text" or "Speaker: text"
    const match = trimmed.match(/^(.+?)\s*(?:\[([^\]]*)\])?\s*:\s*(.+)$/)
    let speaker, timestamp, dialogue

    if (match) {
      speaker = match[1].trim()
      timestamp = match[2] || ''
      dialogue = match[3].trim()
    } else {
      speaker = 'Unknown'
      timestamp = ''
      dialogue = trimmed
    }

    const wordCount = dialogue.split(/\s+/).filter(Boolean).length
    totalWords += wordCount

    if (!speakers[speaker]) {
      speakers[speaker] = { word_count: 0, line_count: 0 }
    }
    speakers[speaker].word_count += wordCount
    speakers[speaker].line_count += 1

    const speakerKeys = Object.keys(speakers)
    const role = speaker === speakerKeys[0] ? 'host' : 'guest'

    lines.push({
      step: lines.length,
      speaker,
      role,
      timestamp,
      text: dialogue,
      word_count: wordCount,
    })
  }

  const speakerStats = {}
  const speakerKeys = Object.keys(speakers)
  for (const name of speakerKeys) {
    const data = speakers[name]
    const pct = totalWords > 0 ? Math.round((data.word_count / totalWords) * 1000) / 10 : 0
    speakerStats[name] = {
      word_count: data.word_count,
      line_count: data.line_count,
      percentage: pct,
      role: name === speakerKeys[0] ? 'host' : 'guest',
    }
  }

  return {
    lines,
    total_lines: lines.length,
    total_words: totalWords,
    speakers: speakerStats,
    exchanges: Math.floor(lines.length / 2),
  }
}
