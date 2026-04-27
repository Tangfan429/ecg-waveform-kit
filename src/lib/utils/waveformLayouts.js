/**
 * ECG 波形布局与显示参数配置
 */

export const LEAD_ORDER = ['I', 'II', 'III', 'aVR', 'aVL', 'aVF', 'V1', 'V2', 'V3', 'V4', 'V5', 'V6']

export const LEAD_DISPLAY_NAMES = {
  I: 'I',
  II: 'II',
  III: 'III',
  aVR: 'aVR',
  aVL: 'aVL',
  aVF: 'aVF',
  V1: 'V1',
  V2: 'V2',
  V3: 'V3',
  V4: 'V4',
  V5: 'V5',
  V6: 'V6'
}

export const LIMB_LEADS = ['I', 'II', 'III', 'aVR', 'aVL', 'aVF']
export const CHEST_LEADS = ['V1', 'V2', 'V3', 'V4', 'V5', 'V6']

export const LAYOUT_CONFIGS = {
  'leadI-single': {
    columns: 1,
    rows: 1,
    leads: [['I']],
    rhythmLeads: []
  },
  'rhythm-single': {
    columns: 1,
    rows: 1,
    leads: [['II']],
    rhythmLeads: []
  },
  'rhythm-triple': {
    columns: 1,
    rows: 3,
    leads: [['II'], ['V1'], ['V5']],
    rhythmLeads: []
  },
  '12x1': {
    columns: 1,
    rows: 12,
    leads: [
      ['I'],
      ['II'],
      ['III'],
      ['aVR'],
      ['aVL'],
      ['aVF'],
      ['V1'],
      ['V2'],
      ['V3'],
      ['V4'],
      ['V5'],
      ['V6']
    ],
    rhythmLeads: []
  },
  '3x4': {
    columns: 4,
    rows: 3,
    leads: [
      ['I', 'aVR', 'V1', 'V4'],
      ['II', 'aVL', 'V2', 'V5'],
      ['III', 'aVF', 'V3', 'V6']
    ],
    rhythmLeads: []
  },
  '6x2': {
    columns: 2,
    rows: 6,
    leads: [
      ['I', 'V1'],
      ['II', 'V2'],
      ['III', 'V3'],
      ['aVR', 'V4'],
      ['aVL', 'V5'],
      ['aVF', 'V6']
    ],
    rhythmLeads: []
  },
  '3x4+1R': {
    columns: 4,
    rows: 3,
    leads: [
      ['I', 'aVR', 'V1', 'V4'],
      ['II', 'aVL', 'V2', 'V5'],
      ['III', 'aVF', 'V3', 'V6']
    ],
    rhythmLeads: ['II']
  },
  '3x4+3R': {
    columns: 4,
    rows: 3,
    leads: [
      ['I', 'aVR', 'V1', 'V4'],
      ['II', 'aVL', 'V2', 'V5'],
      ['III', 'aVF', 'V3', 'V6']
    ],
    rhythmLeads: ['II', 'V1', 'V5'],
    // 3x4+3R 的节律导航框只跟随底部 V5 长导联。
    navigatorLead: 'V5'
  },
  '6x2+1R': {
    columns: 2,
    rows: 6,
    leads: [
      ['I', 'V1'],
      ['II', 'V2'],
      ['III', 'V3'],
      ['aVR', 'V4'],
      ['aVL', 'V5'],
      ['aVF', 'V6']
    ],
    rhythmLeads: ['II']
  },
  '6x1': {
    columns: 1,
    rows: 6,
    leads: [['V1'], ['V2'], ['V3'], ['V4'], ['V5'], ['V6']],
    rhythmLeads: []
  }
}

export const GAIN_CONFIGS = {
  '2.5': {
    label: '2.5mm/mV',
    pixelsPerMv: 12.5,
    mvPerSmallGrid: 0.4
  },
  '5': {
    label: '5mm/mV',
    pixelsPerMv: 25,
    mvPerSmallGrid: 0.2
  },
  '10': {
    label: '10mm/mV',
    pixelsPerMv: 50,
    mvPerSmallGrid: 0.1
  },
  '20': {
    label: '20mm/mV',
    pixelsPerMv: 100,
    mvPerSmallGrid: 0.05
  },
  '10/5': {
    label: '10/5mm/mV',
    limbPixelsPerMv: 50,
    chestPixelsPerMv: 25,
    limbMvPerSmallGrid: 0.1,
    chestMvPerSmallGrid: 0.2
  }
}

export const SPEED_CONFIGS = {
  '12.5': {
    label: '12.5mm/s',
    pixelsPerSecond: 62.5,
    secondsPerSmallGrid: 0.08
  },
  '25': {
    label: '25mm/s',
    pixelsPerSecond: 125,
    secondsPerSmallGrid: 0.04
  },
  '50': {
    label: '50mm/s',
    pixelsPerSecond: 250,
    secondsPerSmallGrid: 0.02
  }
}
// Keep a fixed paper width and let paper speed decide the visible duration.
// 250mm maps to 10s at 25mm/s, 5s at 50mm/s, and 20s at 12.5mm/s.
const STANDARD_WAVEFORM_PAPER_MM = 250
export function getLayoutConfig(layoutType) {
  return LAYOUT_CONFIGS[layoutType] || LAYOUT_CONFIGS['6x2+1R']
}

export function getGainConfig(gainValue) {
  return GAIN_CONFIGS[gainValue] || GAIN_CONFIGS['10']
}

export function getSpeedConfig(speedValue) {
  return SPEED_CONFIGS[speedValue] || SPEED_CONFIGS['25']
}
export function getStandardWaveformDuration(
  speedValue,
  availableDuration = Number.POSITIVE_INFINITY
) {
  const speedMmPerSecond = Number(speedValue)
  const fallbackSpeed = Number(
    getSpeedConfig(speedValue).label.replace('mm/s', '')
  )
  const resolvedSpeed =
    Number.isFinite(speedMmPerSecond) && speedMmPerSecond > 0
      ? speedMmPerSecond
      : fallbackSpeed
  const standardDuration = STANDARD_WAVEFORM_PAPER_MM / resolvedSpeed
  if (!Number.isFinite(availableDuration)) {
    return standardDuration
  }
  return Math.max(0, Math.min(availableDuration, standardDuration))
}
export function getPixelsPerMv(gainValue, leadName = 'I') {
  const config = getGainConfig(gainValue)
  if (gainValue === '10/5') {
    return LIMB_LEADS.includes(leadName) ? config.limbPixelsPerMv : config.chestPixelsPerMv
  }
  return config.pixelsPerMv
}

export function isLimbLead(leadName) {
  return LIMB_LEADS.includes(leadName)
}

export function getLeadDisplayName(leadName) {
  return LEAD_DISPLAY_NAMES[leadName] || leadName
}
