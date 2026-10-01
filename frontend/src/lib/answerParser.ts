/**
 * Structure extraction for the backend's grounded answer text.
 *
 * `synthesize_grounded_answer` in `backend/app/services/llm_service.py` emits a
 * predictable Markdown envelope:
 *
 *   ### Resolution for: `<query>`
 *   **Primary Source**: *title* (Version `x`, Vendor: `y`)
 *   **Section Reference**: `sec`
 *
 *   **Troubleshooting Summary:** …
 *   **Exact Troubleshooting Steps (Source-Grounded):** …
 *   **Verification & Diagnostic Commands:** ```bash … ```
 *   > **Verified Source Citation**: [title - sec (vX)]
 *   **Additional Corroborating References:** …
 *
 * We reorganise that text into a scannable layout. Every value below is a
 * verbatim slice of the backend response — nothing is invented or rewritten.
 * When the envelope is not recognised (e.g. an external LLM returned a
 * free-form answer) the raw text is rendered as Markdown instead.
 *
 * The `**Primary Source**` / `**Section Reference**` header lines are
 * intentionally dropped: the citation panel renders those fields from the
 * structured `citations` array, which is authoritative. Rendering both would
 * duplicate the same information.
 */

const HEADING = {
  summary: '**Troubleshooting Summary:**',
  steps: '**Exact Troubleshooting Steps (Source-Grounded):**',
  commands: '**Verification & Diagnostic Commands:**',
  references: '**Additional Corroborating References:**',
} as const

export interface ParsedAnswer {
  /** True when the answer matched the backend's Markdown envelope. */
  structured: boolean
  summary: string | null
  steps: string[]
  commands: string[]
  /** The `> **Verified Source Citation**` line, if present. */
  verifiedCitation: string | null
  /** Bullet lines under "Additional Corroborating References". */
  additionalReferences: string[]
  /** Unparsed remainder, rendered as Markdown. Empty for structured answers. */
  leftover: string
}

function slice(text: string, from: number, to: number): string {
  if (from < 0) return ''
  return text.slice(from, to < 0 ? text.length : to).trim()
}

function nonEmptyLines(block: string): string[] {
  return block
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
}

/** Strip the leading bold label from a section body ("**Summary:** text" → "text"). */
function withoutLabel(block: string): string {
  return block.replace(/^\*\*[^*]+\*\*:?\s*/, '').trim()
}

/**
 * A "Step N: …" line introduces the structured step list. Drop it from the
 * summary so the same instruction is not shown twice.
 */
function trimSummary(summary: string): string {
  const stepIndex = summary.search(/\bStep\s+\d+\s*[:.)]/i)
  if (stepIndex <= 0) return summary
  const head = summary.slice(0, stepIndex).trim()
  const tail = summary.slice(stepIndex).trim()
  return head.length >= 20 ? head : tail
}

export function parseGroundedAnswer(raw: string): ParsedAnswer {
  const text = raw.replace(/\r\n/g, '\n')

  const at = (heading: string) => text.indexOf(heading)
  const summaryAt = at(HEADING.summary)
  const stepsAt = at(HEADING.steps)
  const commandsAt = at(HEADING.commands)
  const referencesAt = at(HEADING.references)

  if (stepsAt < 0 && summaryAt < 0) {
    return {
      structured: false,
      summary: null,
      steps: [],
      commands: [],
      verifiedCitation: null,
      additionalReferences: [],
      leftover: raw,
    }
  }

  const nextHeading = (from: number): number =>
    [stepsAt, commandsAt, referencesAt]
      .filter((i) => i >= 0 && i > from)
      .reduce<number>((min, i) => (min < 0 ? i : Math.min(min, i)), -1)

  const quoteMatch = /^>\s*\*\*Verified Source Citation/m.exec(text)
  const quoteAt = quoteMatch ? quoteMatch.index : -1

  const sectionEnd = (from: number): number => {
    const candidates = [nextHeading(from), quoteAt > from ? quoteAt : -1].filter((i) => i > from)
    return candidates.reduce<number>((min, i) => (min < 0 ? i : Math.min(min, i)), -1)
  }

  const summaryBlock =
    summaryAt >= 0 ? slice(text, summaryAt + HEADING.summary.length, sectionEnd(summaryAt)) : ''
  const summary = summaryBlock ? trimSummary(withoutLabel(summaryBlock)) : null

  const steps =
    stepsAt >= 0 ? nonEmptyLines(slice(text, stepsAt + HEADING.steps.length, sectionEnd(stepsAt))) : []

  // Commands live in a fenced ```bash block. Prefer the fence so a trailing
  // "> Verified Source Citation" quote can never end up inside the code block.
  const commandsBlock =
    commandsAt >= 0 ? slice(text, commandsAt + HEADING.commands.length, sectionEnd(commandsAt)) : ''
  const fence = commandsBlock.match(/```[a-z]*\n?([\s\S]*?)```/i)
  const commandText = fence ? fence[1] : commandsBlock
  const commands = nonEmptyLines(commandText).map((line) => line.replace(/^\$+\s?/, ''))

  const verifiedCitation = quoteAt >= 0 ? slice(text, quoteAt, -1).split('\n')[0].replace(/^>\s*/, '') : null

  const additionalReferences =
    referencesAt >= 0 ? nonEmptyLines(slice(text, referencesAt + HEADING.references.length, -1)) : []

  return {
    structured: true,
    summary: summary || null,
    steps,
    commands,
    verifiedCitation,
    additionalReferences,
    leftover: '',
  }
}
