/**
 * ECG 模拟波形数据生成工具
 * 生成符合医学标准的 12 导联 ECG 波形数据
 * 参考：https://github.com/dy1901/ecg_plot
 */

// 标准 12 导联顺序
export const LEAD_ORDER = ['I', 'II', 'III', 'aVR', 'aVL', 'aVF', 'V1', 'V2', 'V3', 'V4', 'V5', 'V6']

// 心率数据（与 Figma 设计稿一致）
export const mockHeartRates = [70, 70, 70, 70, 70, 70, 73, 70, 68, 67, 67, 69, 70, 72, 72, 68]

// R-R 间期数据（单位：ms）
export const mockRRIntervals = [857, 857, 857, 857, 857, 857, 822, 857, 882, 896, 896, 870, 857, 833, 833, 882]

/**
 * 各导联的波形参数配置
 * 基于正常窦性心律的典型波形特征
 *
 * 波形组成：
 * - P波：心房去极化，通常正向（aVR 除外）
 * - QRS波群：心室去极化
 *   - Q波：初始向下偏转
 *   - R波：第一个向上偏转
 *   - S波：R波后的向下偏转
 * - T波：心室复极化
 *
 * 单位：mV
 */
const LEAD_PARAMS = {
  // 肢体导联
  'I': {
    pAmplitude: 0.15,
    pWidth: 0.08,
    qAmplitude: -0.05,
    qWidth: 0.02,
    rAmplitude: 0.9,
    rWidth: 0.04,
    sAmplitude: -0.1,
    sWidth: 0.02,
    tAmplitude: 0.3,
    tWidth: 0.16,
    baseline: 0
  },
  'II': {
    pAmplitude: 0.2,
    pWidth: 0.08,
    qAmplitude: -0.05,
    qWidth: 0.02,
    rAmplitude: 1.2,
    rWidth: 0.045,
    sAmplitude: -0.1,
    sWidth: 0.02,
    tAmplitude: 0.4,
    tWidth: 0.16,
    baseline: 0
  },
  'III': {
    pAmplitude: 0.1,
    pWidth: 0.08,
    qAmplitude: -0.15,
    qWidth: 0.025,
    rAmplitude: 0.7,
    rWidth: 0.04,
    sAmplitude: -0.15,
    sWidth: 0.025,
    tAmplitude: 0.2,
    tWidth: 0.14,
    baseline: 0
  },
  // aVR 导联 - 波形倒置（QRS 主波向下，P波和T波也倒置）
  'aVR': {
    pAmplitude: -0.12,
    pWidth: 0.08,
    qAmplitude: 0.1,      // Q波变为正向（看起来像r波）
    qWidth: 0.02,
    rAmplitude: -0.5,     // R波变为负向（深S波）
    rWidth: 0.045,
    sAmplitude: 0.05,     // S波变为正向
    sWidth: 0.02,
    tAmplitude: -0.25,
    tWidth: 0.14,
    baseline: 0
  },
  'aVL': {
    pAmplitude: 0.08,
    pWidth: 0.08,
    qAmplitude: -0.1,
    qWidth: 0.025,
    rAmplitude: 0.6,
    rWidth: 0.04,
    sAmplitude: -0.2,
    sWidth: 0.025,
    tAmplitude: 0.15,
    tWidth: 0.14,
    baseline: 0
  },
  'aVF': {
    pAmplitude: 0.12,
    pWidth: 0.08,
    qAmplitude: -0.1,
    qWidth: 0.02,
    rAmplitude: 0.9,
    rWidth: 0.045,
    sAmplitude: -0.1,
    sWidth: 0.02,
    tAmplitude: 0.25,
    tWidth: 0.16,
    baseline: 0
  },
  // 胸导联 - V1-V2 呈 rS 型（小r大S），V3-V4 过渡，V5-V6 呈 Rs 型（大R小s）
  'V1': {
    pAmplitude: 0.1,
    pWidth: 0.08,
    qAmplitude: 0,
    qWidth: 0,
    rAmplitude: 0.25,     // 小 r 波
    rWidth: 0.03,
    sAmplitude: -1.2,     // 深 S 波
    sWidth: 0.05,
    tAmplitude: 0.2,
    tWidth: 0.14,
    baseline: 0
  },
  'V2': {
    pAmplitude: 0.12,
    pWidth: 0.08,
    qAmplitude: 0,
    qWidth: 0,
    rAmplitude: 0.4,      // 小 r 波
    rWidth: 0.035,
    sAmplitude: -1.5,     // 深 S 波
    sWidth: 0.05,
    tAmplitude: 0.35,
    tWidth: 0.16,
    baseline: 0
  },
  'V3': {
    pAmplitude: 0.12,
    pWidth: 0.08,
    qAmplitude: -0.05,
    qWidth: 0.015,
    rAmplitude: 0.9,      // R、S 接近等幅
    rWidth: 0.04,
    sAmplitude: -0.8,
    sWidth: 0.04,
    tAmplitude: 0.4,
    tWidth: 0.16,
    baseline: 0
  },
  'V4': {
    pAmplitude: 0.12,
    pWidth: 0.08,
    qAmplitude: -0.1,
    qWidth: 0.02,
    rAmplitude: 1.3,      // R 波增高
    rWidth: 0.045,
    sAmplitude: -0.4,     // S 波减小
    sWidth: 0.03,
    tAmplitude: 0.45,
    tWidth: 0.16,
    baseline: 0
  },
  'V5': {
    pAmplitude: 0.1,
    pWidth: 0.08,
    qAmplitude: -0.12,
    qWidth: 0.025,
    rAmplitude: 1.5,      // R 波最高
    rWidth: 0.045,
    sAmplitude: -0.2,     // S 波很小
    sWidth: 0.02,
    tAmplitude: 0.35,
    tWidth: 0.16,
    baseline: 0
  },
  'V6': {
    pAmplitude: 0.1,
    pWidth: 0.08,
    qAmplitude: -0.1,
    qWidth: 0.025,
    rAmplitude: 1.2,
    rWidth: 0.04,
    sAmplitude: -0.1,
    sWidth: 0.015,
    tAmplitude: 0.3,
    tWidth: 0.16,
    baseline: 0
  }
}

/**
 * 生成高斯波形
 * @param {number} t - 时间点 (0-1)
 * @param {number} center - 波峰中心位置 (0-1)
 * @param {number} width - 波形宽度
 * @param {number} amplitude - 振幅
 * @returns {number} 波形值
 */
function gaussian(t, center, width, amplitude) {
  const sigma = width / 4  // 标准差
  const exponent = -Math.pow(t - center, 2) / (2 * Math.pow(sigma, 2))
  return amplitude * Math.exp(exponent)
}

/**
 * 生成单个心动周期的 PQRST 波形
 * @param {number} sampleRate - 采样率 (Hz)
 * @param {number} rrInterval - R-R 间期 (ms)
 * @param {string} leadName - 导联名称
 * @returns {number[]} 波形数据 (mV)
 */
function generateSingleBeat(sampleRate, rrInterval, leadName) {
  const duration = rrInterval / 1000  // 转换为秒
  const numSamples = Math.round(duration * sampleRate)
  const params = LEAD_PARAMS[leadName] || LEAD_PARAMS['II']

  const data = new Array(numSamples).fill(params.baseline)

  // 波形时间分布（相对于心动周期）
  const pCenter = 0.12      // P波中心位置
  const qrsStart = 0.20     // QRS起始位置
  const tCenter = 0.55      // T波中心位置

  for (let i = 0; i < numSamples; i++) {
    const t = i / numSamples  // 归一化时间 (0-1)
    let value = params.baseline

    // P波
    if (params.pAmplitude !== 0) {
      value += gaussian(t, pCenter, params.pWidth, params.pAmplitude)
    }

    // Q波
    if (params.qAmplitude !== 0 && params.qWidth > 0) {
      const qCenter = qrsStart
      value += gaussian(t, qCenter, params.qWidth, params.qAmplitude)
    }

    // R波（使用更尖锐的波形）
    const rCenter = qrsStart + (params.qWidth || 0) / 2 + params.rWidth / 2
    value += gaussian(t, rCenter, params.rWidth * 0.6, params.rAmplitude)

    // S波
    if (params.sAmplitude !== 0 && params.sWidth > 0) {
      const sCenter = rCenter + params.rWidth / 2 + params.sWidth / 2
      value += gaussian(t, sCenter, params.sWidth * 0.8, params.sAmplitude)
    }

    // T波
    value += gaussian(t, tCenter, params.tWidth, params.tAmplitude)

    data[i] = value
  }

  return data
}

/**
 * 生成指定导联的完整波形数据
 * @param {string} leadName - 导联名称
 * @param {number} duration - 持续时间 (秒)
 * @param {number} sampleRate - 采样率 (Hz)
 * @returns {number[]} 波形数据 (mV)
 */
export function generateMockWaveform(leadName, duration = 10, sampleRate = 500) {
  const data = []
  let currentTime = 0
  let beatIndex = 0

  while (currentTime < duration) {
    const rrInterval = mockRRIntervals[beatIndex % mockRRIntervals.length]
    const beatData = generateSingleBeat(sampleRate, rrInterval, leadName)

    data.push(...beatData)
    currentTime += rrInterval / 1000
    beatIndex++
  }

  // 截取到指定时长
  const totalSamples = Math.round(duration * sampleRate)
  return data.slice(0, totalSamples)
}

/**
 * 生成所有 12 导联的波形数据
 * @param {number} duration - 持续时间 (秒)
 * @param {number} sampleRate - 采样率 (Hz)
 * @returns {object} 包含所有导联波形数据的对象 { leadName: number[] }
 */
export function generateAllLeadsWaveform(duration = 10, sampleRate = 500) {
  const waveformData = {}

  LEAD_ORDER.forEach(lead => {
    waveformData[lead] = generateMockWaveform(lead, duration, sampleRate)
  })

  return waveformData
}

/**
 * 生成节律导联的长波形数据（用于底部连续显示）
 * @param {string} leadName - 导联名称
 * @param {number} duration - 持续时间 (秒)
 * @param {number} sampleRate - 采样率 (Hz)
 * @returns {number[]} 波形数据
 */
export function generateRhythmWaveform(leadName = 'II', duration = 20, sampleRate = 500) {
  return generateMockWaveform(leadName, duration, sampleRate)
}

/**
 * 将波形数据转换为 Canvas 路径点
 * @param {number[]} data - 波形数据 (mV)
 * @param {number} startX - 起始 X 坐标
 * @param {number} centerY - 中心 Y 坐标
 * @param {number} pixelsPerMv - 每 mV 对应像素数
 * @param {number} pixelsPerSecond - 每秒对应像素数
 * @param {number} sampleRate - 采样率
 * @returns {Array<{x: number, y: number}>} 路径点数组
 */
export function waveformToCanvasPoints(data, startX, centerY, pixelsPerMv, pixelsPerSecond, sampleRate = 500) {
  if (!data || data.length === 0) return []

  const pixelsPerSample = pixelsPerSecond / sampleRate

  return data.map((value, index) => ({
    x: startX + index * pixelsPerSample,
    y: centerY - value * pixelsPerMv
  }))
}

/**
 * 将波形数据转换为 SVG 路径
 * @param {number[]} data - 波形数据 (mV)
 * @param {number} width - SVG 宽度 (像素)
 * @param {number} height - SVG 高度 (像素)
 * @param {number} pixelsPerMv - 每 mV 对应像素数（增益）
 * @param {number} pixelsPerSecond - 每秒对应像素数（走速）
 * @param {number} sampleRate - 采样率 (Hz)
 * @returns {string} SVG 路径字符串
 */
export function waveformToSvgPath(data, width, height, pixelsPerMv, pixelsPerSecond, sampleRate = 500) {
  if (!data || data.length === 0) return ''

  const centerY = height / 2
  const pixelsPerSample = pixelsPerSecond / sampleRate

  let path = ''
  data.forEach((value, index) => {
    const x = index * pixelsPerSample
    const y = centerY - (value * pixelsPerMv)

    if (index === 0) {
      path = `M ${x.toFixed(2)} ${y.toFixed(2)}`
    } else {
      path += ` L ${x.toFixed(2)} ${y.toFixed(2)}`
    }
  })

  return path
}

/**
 * 获取波形显示的时间范围
 * @param {string} speedValue - 走速值
 * @param {number} width - 显示宽度（像素）
 * @returns {number} 显示的时间范围（秒）
 */
export function getDisplayDuration(speedValue, width) {
  const speedConfigs = {
    '12.5': 62.5,   // 12.5mm/s = 62.5px/s
    '25': 125,      // 25mm/s = 125px/s
    '50': 250       // 50mm/s = 250px/s
  }

  const pixelsPerSecond = speedConfigs[speedValue] || 125
  return width / pixelsPerSecond
}
