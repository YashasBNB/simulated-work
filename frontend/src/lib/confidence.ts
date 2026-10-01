export const NO_ANSWER_TEXT =
  'No confident answer found in authorized runbooks and configuration guides for this query.'

/**
 * Backend confidence threshold (`settings.CONFIDENCE_THRESHOLD`, default 0.35).
 * Used for display banding only — the authoritative `is_confident` flag on the
 * answer payload always wins.
 */
export const CONFIDENCE_THRESHOLD = 0.35

export type ConfidenceBand = 'high' | 'moderate' | 'low' | 'none'

export function confidenceBand(confidence: number, isConfident: boolean): ConfidenceBand {
  if (!isConfident) return 'none'
  if (confidence >= 0.7) return 'high'
  if (confidence >= 0.45) return 'moderate'
  return 'low'
}

export const CONFIDENCE_BAND_STYLES: Record<ConfidenceBand, { text: string; bg: string; bar: string; label: string }> =
  {
    high: {
      text: 'text-ops-healthy',
      bg: 'bg-ops-healthy-bg',
      bar: 'bg-ops-healthy',
      label: 'High confidence',
    },
    moderate: {
      text: 'text-ops-warning',
      bg: 'bg-ops-warning-bg',
      bar: 'bg-ops-warning',
      label: 'Moderate confidence',
    },
    low: {
      text: 'text-ops-warning',
      bg: 'bg-ops-warning-bg',
      bar: 'bg-ops-warning',
      label: 'Low confidence',
    },
    none: {
      text: 'text-ops-critical',
      bg: 'bg-ops-critical-bg',
      bar: 'bg-ops-critical',
      label: 'No confident answer',
    },
  }
