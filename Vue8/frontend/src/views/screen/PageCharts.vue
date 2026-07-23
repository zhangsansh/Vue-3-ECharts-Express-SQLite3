<template>
  <div class="page">
    <div class="grid">
      <Panel title="缓动函数可视化 · 产量增长动画曲线">
        <div ref="easeRef" class="chart"></div>
      </Panel>
      <Panel title="阶梯瀑布图 · 因素对产量贡献分解">
        <div ref="waterRef" class="chart"></div>
      </Panel>
      <Panel title="流式渲染 + 视觉映射 · 动态产量点云">
        <div ref="streamRef" class="chart"></div>
      </Panel>
      <Panel title="地理等值区划 + 散点 · 河南省产量空间">
        <div ref="geoRef" class="chart"></div>
      </Panel>
      <Panel title="线图绘制百万级路径 · 街道网络风格示意" class="wide">
        <div ref="streetRef" class="chart"></div>
      </Panel>
    </div>
  </div>
</template>

<script setup>
import { onMounted, onUnmounted, ref } from 'vue'
import * as echarts from 'echarts'
import Panel from '@/components/Panel.vue'
import { useChart, darkTooltip, axisStyle } from '@/components/chartHelper'
import { getOverview, mlAnalyze } from '@/api'

const easeRef = ref(null)
const waterRef = ref(null)
const streamRef = ref(null)
const geoRef = ref(null)
const streetRef = ref(null)

const easeChart = useChart(easeRef)
const waterChart = useChart(waterRef)
const streamChart = useChart(streamRef)
const geoChart = useChart(geoRef)
const streetChart = useChart(streetRef)

let streamTimer = null
let streamData = []

function easingFuncs() {
  return {
    linear: (k) => k,
    quadraticIn: (k) => k * k,
    cubicInOut: (k) => (k < 0.5 ? 4 * k * k * k : 0.5 * Math.pow(2 * k - 2, 3) + 1),
    elasticOut: (k) => {
      const s = 0.075
      return Math.pow(2, -10 * k) * Math.sin((k - s) * (2 * Math.PI) / 0.3) + 1
    },
    bounceOut: (k) => {
      if (k < 1 / 2.75) return 7.5625 * k * k
      if (k < 2 / 2.75) return 7.5625 * (k -= 1.5 / 2.75) * k + 0.75
      if (k < 2.5 / 2.75) return 7.5625 * (k -= 2.25 / 2.75) * k + 0.9375
      return 7.5625 * (k -= 2.625 / 2.75) * k + 0.984375
    }
  }
}

function renderEasing() {
  const N = 100
  const funcs = easingFuncs()
  const series = Object.keys(funcs).map((name) => {
    const data = []
    for (let i = 0; i <= N; i++) {
      const x = i / N
      data.push([x, funcs[name](x)])
    }
    return { name, type: 'line', showSymbol: false, data, sampling: 'lttb' }
  })
  easeChart.setOption({
    tooltip: { ...darkTooltip, trigger: 'axis' },
    legend: { textStyle: { color: '#9cb6d0' }, top: 0, type: 'scroll' },
    grid: { left: 40, right: 16, top: 36, bottom: 28 },
    xAxis: { type: 'value', min: 0, max: 1, ...axisStyle },
    yAxis: { type: 'value', min: 0, max: 1.2, ...axisStyle },
    series
  })
}

async function renderWaterfall() {
  let importance = []
  try {
    const res = await mlAnalyze()
    importance = res.data.importance.slice(0, 6)
  } catch (_) {
    importance = [
      { label: '灌溉', weight: 0.22 },
      { label: '土壤', weight: 0.18 },
      { label: '化肥', weight: 0.15 },
      { label: '降雨', weight: 0.14 },
      { label: '机械化', weight: 0.12 },
      { label: '病虫害', weight: -0.1 }
    ]
  }
  const base = 400
  const names = ['基线产量', ...importance.map((d) => d.label), '综合产量']
  const help = []
  const positive = []
  const negative = []
  let acc = base
  help.push(0)
  positive.push(base)
  negative.push('-')
  for (const item of importance) {
    const delta = Number((item.weight * 200).toFixed(1))
    if (delta >= 0) {
      help.push(acc)
      positive.push(delta)
      negative.push('-')
      acc += delta
    } else {
      help.push(acc + delta)
      positive.push('-')
      negative.push(-delta)
      acc += delta
    }
  }
  help.push(0)
  positive.push(Number(acc.toFixed(1)))
  negative.push('-')

  waterChart.setOption({
    tooltip: { ...darkTooltip, trigger: 'axis' },
    grid: { left: 50, right: 16, top: 24, bottom: 40 },
    xAxis: { type: 'category', data: names, axisLabel: { color: '#9cb6d0', rotate: 25, fontSize: 10 } },
    yAxis: { type: 'value', ...axisStyle },
    series: [
      { type: 'bar', stack: 'all', silent: true, itemStyle: { borderColor: 'transparent', color: 'transparent' }, data: help },
      { name: '正向贡献', type: 'bar', stack: 'all', data: positive, itemStyle: { color: '#3ddc97' } },
      { name: '负向贡献', type: 'bar', stack: 'all', data: negative, itemStyle: { color: '#ff6b6b' } }
    ]
  })
}

function renderStream() {
  streamData = []
  const chart = streamChart.init()
  streamChart.setOption({
    tooltip: darkTooltip,
    grid: { left: 40, right: 50, top: 20, bottom: 30 },
    xAxis: { type: 'value', name: '降雨', ...axisStyle },
    yAxis: { type: 'value', name: '产量', ...axisStyle },
    visualMap: {
      min: 12,
      max: 18,
      dimension: 2,
      orient: 'vertical',
      right: 0,
      top: 'center',
      text: ['气温高', '气温低'],
      textStyle: { color: '#9cb6d0' },
      inRange: { color: ['#1a5276', '#f4d03f', '#e74c3c'] },
      calculable: true
    },
    series: [
      {
        type: 'scatter',
        symbolSize: (val) => Math.max(6, val[3] / 40),
        data: streamData,
        large: true,
        largeThreshold: 500
      }
    ]
  })

  let i = 0
  streamTimer = setInterval(() => {
    for (let n = 0; n < 20; n++) {
      streamData.push([
        400 + Math.random() * 500,
        300 + Math.random() * 250,
        12 + Math.random() * 6,
        50 + Math.random() * 400
      ])
    }
    if (streamData.length > 2000) streamData.splice(0, 200)
    chart.setOption({ series: [{ data: streamData }] })
    i++
    if (i > 80) clearInterval(streamTimer)
  }, 200)
}

async function renderGeo() {
  const overview = (await getOverview()).data
  let geo = null
  try {
    const res = await fetch('https://geo.datav.aliyun.com/areas_v3/bound/410000_full.json')
    geo = await res.json()
  } catch (_) {
    return
  }
  echarts.registerMap('henan2', geo)
  const mapData = overview.mapData.map((d) => ({
    name: d.region_name,
    value: d.yield
  }))
  const scatter = overview.mapData.map((d) => {
    // 用名称匹配中心点 — 简化：从 features 找
    const feat = geo.features.find(
      (f) => f.properties.name === d.region_name || f.properties.name.replace('市', '') === d.region_name.replace('市', '')
    )
    const center = feat?.properties?.center || feat?.properties?.centroid
    if (!center) return null
    return { name: d.region_name, value: [...center, d.yield] }
  }).filter(Boolean)

  geoChart.setOption({
    tooltip: darkTooltip,
    geo: {
      map: 'henan2',
      roam: true,
      itemStyle: { areaColor: '#0a2740', borderColor: '#3ecfff' },
      emphasis: { itemStyle: { areaColor: '#145a86' } },
      label: { show: false }
    },
    visualMap: {
      min: Math.min(...overview.mapData.map((d) => d.yield)),
      max: Math.max(...overview.mapData.map((d) => d.yield)),
      left: 10,
      bottom: 10,
      textStyle: { color: '#9cb6d0' },
      inRange: { color: ['#0b3a52', '#f0c14b'] }
    },
    series: [
      {
        type: 'map',
        geoIndex: 0,
        data: mapData.map((d) => {
          const feat = geo.features.find(
            (f) =>
              f.properties.name === d.name ||
              f.properties.name.replace('市', '') === d.name.replace('市', '')
          )
          return { name: feat?.properties?.name || d.name, value: d.value }
        })
      },
      {
        type: 'effectScatter',
        coordinateSystem: 'geo',
        data: scatter,
        symbolSize: (val) => Math.max(8, val[2] / 40),
        itemStyle: { color: '#ff6b6b' },
        rippleEffect: { scale: 3 }
      }
    ]
  })
}

function renderStreet() {
  // 用线图模拟大规模路径（约 8 万线段点，表现百万级渲染思路；浏览器性能可控）
  const lines = []
  const seedLng = 113.6
  const seedLat = 34.7
  for (let i = 0; i < 4000; i++) {
    const coords = []
    let x = seedLng + (Math.random() - 0.5) * 4
    let y = seedLat + (Math.random() - 0.5) * 3.5
    const steps = 8 + Math.floor(Math.random() * 12)
    for (let s = 0; s < steps; s++) {
      x += (Math.random() - 0.5) * 0.08
      y += (Math.random() - 0.5) * 0.08
      coords.push([x, y])
    }
    lines.push({ coords })
  }
  streetChart.setOption({
    backgroundColor: 'transparent',
    tooltip: { show: false },
    xAxis: { show: false, min: 111.5, max: 116 },
    yAxis: { show: false, min: 31.5, max: 36.5, scale: true },
    grid: { left: 0, right: 0, top: 0, bottom: 0 },
    series: [
      {
        type: 'lines',
        coordinateSystem: 'cartesian2d',
        polyline: true,
        data: lines,
        lineStyle: { color: 'rgba(0,212,255,0.25)', width: 0.6 },
        progressive: 400,
        progressiveThreshold: 2000,
        animation: false
      }
    ]
  })
}

function onResize() {
  ;[easeChart, waterChart, streamChart, geoChart, streetChart].forEach((c) => c.resize())
}

onMounted(async () => {
  renderEasing()
  await renderWaterfall()
  renderStream()
  await renderGeo()
  renderStreet()
  window.addEventListener('resize', onResize)
})
onUnmounted(() => {
  window.removeEventListener('resize', onResize)
  if (streamTimer) clearInterval(streamTimer)
  ;[easeChart, waterChart, streamChart, geoChart, streetChart].forEach((c) => c.dispose())
})
</script>

<style scoped>
.page {
  height: 100%;
}
.grid {
  height: 100%;
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: 1fr 1fr 1fr;
  gap: 8px;
}
.wide {
  grid-column: 1 / -1;
}
.chart {
  width: 100%;
  height: 100%;
  min-height: 160px;
}
@media (max-width: 900px) {
  .grid {
    grid-template-columns: 1fr;
    grid-template-rows: repeat(5, 240px);
    overflow: auto;
  }
  .wide {
    grid-column: auto;
  }
}
</style>
