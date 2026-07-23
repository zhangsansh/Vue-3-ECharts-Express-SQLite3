import * as echarts from 'echarts'

export function useChart(elRef) {
  let chart = null

  function init() {
    if (!elRef.value) return null
    chart = echarts.init(elRef.value, null, { renderer: 'canvas' })
    return chart
  }

  function setOption(option, notMerge = true) {
    if (!chart) init()
    chart?.setOption(option, notMerge)
  }

  function resize() {
    chart?.resize()
  }

  function dispose() {
    chart?.dispose()
    chart = null
  }

  return { init, setOption, resize, dispose, getInstance: () => chart }
}

export const darkTooltip = {
  backgroundColor: 'rgba(6,22,42,0.92)',
  borderColor: 'rgba(0,212,255,0.4)',
  textStyle: { color: '#e8f4ff' }
}

export const axisStyle = {
  axisLine: { lineStyle: { color: 'rgba(0,212,255,0.35)' } },
  axisLabel: { color: '#9cb6d0' },
  splitLine: { lineStyle: { color: 'rgba(0,212,255,0.08)' } }
}
