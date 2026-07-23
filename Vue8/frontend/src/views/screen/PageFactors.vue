<template>
  <div class="page">
    <div class="grid">
      <Panel title="渐变堆叠面积图 · 关键因素时序">
        <div ref="stackRef" class="chart"></div>
      </Panel>
      <Panel title="大数据量面积图 · 产量波动模拟">
        <div ref="bigRef" class="chart"></div>
      </Panel>
      <Panel title="堆叠柱状图归一化 · 因素结构占比">
        <div ref="normRef" class="chart"></div>
      </Panel>
      <Panel title="矩阵微型折线图 · 各地市产量走势">
        <div ref="miniRef" class="chart"></div>
      </Panel>
    </div>
  </div>
</template>

<script setup>
import { onMounted, onUnmounted, ref } from 'vue'
import * as echarts from 'echarts'
import Panel from '@/components/Panel.vue'
import { useChart, darkTooltip, axisStyle } from '@/components/chartHelper'
import { getFactorTrend, getOverview, getWheatList } from '@/api'

const stackRef = ref(null)
const bigRef = ref(null)
const normRef = ref(null)
const miniRef = ref(null)
const charts = [useChart(stackRef), useChart(bigRef), useChart(normRef), useChart(miniRef)]

function makeBigAreaData() {
  // 模拟高密度时序（约 2 万点）
  const data = []
  let base = 450
  for (let i = 0; i < 20000; i++) {
    base += Math.sin(i / 180) * 0.8 + (Math.random() - 0.5) * 2.2
    data.push([i, Number(base.toFixed(2))])
  }
  return data
}

async function render() {
  const [factorRes, overviewRes, wheatRes] = await Promise.all([
    getFactorTrend(),
    getOverview(),
    getWheatList({ page: 1, pageSize: 500 })
  ])
  const yearly = factorRes.data
  const years = yearly.map((d) => d.year)

  // 渐变堆叠面积图
  const factors = [
    { key: 'rainfall', name: '降雨量', color: '#00d4ff' },
    { key: 'fertilizer', name: '化肥', color: '#3ddc97' },
    { key: 'irrigation', name: '灌溉', color: '#f0c14b' },
    { key: 'mechanization', name: '机械化', color: '#ff8a5b' },
    { key: 'disease_index', name: '病虫害', color: '#ff6b6b' }
  ]
  charts[0].setOption({
    tooltip: { ...darkTooltip, trigger: 'axis' },
    legend: { textStyle: { color: '#9cb6d0' }, top: 0 },
    grid: { left: 45, right: 20, top: 36, bottom: 28 },
    xAxis: { type: 'category', data: years, ...axisStyle },
    yAxis: { type: 'value', ...axisStyle },
    series: factors.map((f) => ({
      name: f.name,
      type: 'line',
      stack: 'Total',
      smooth: true,
      areaStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: f.color },
          { offset: 1, color: 'rgba(0,0,0,0)' }
        ])
      },
      lineStyle: { width: 1.5, color: f.color },
      showSymbol: false,
      data: yearly.map((d) => d[f.key])
    }))
  })

  // 大数据量面积图
  const big = makeBigAreaData()
  charts[1].setOption({
    tooltip: { ...darkTooltip, trigger: 'axis' },
    grid: { left: 45, right: 20, top: 20, bottom: 40 },
    xAxis: { type: 'value', ...axisStyle },
    yAxis: { type: 'value', scale: true, ...axisStyle },
    dataZoom: [{ type: 'inside' }, { type: 'slider', height: 18, bottom: 8 }],
    series: [
      {
        type: 'line',
        showSymbol: false,
        sampling: 'lttb',
        large: true,
        data: big,
        lineStyle: { width: 1, color: '#00d4ff' },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(0,212,255,0.5)' },
            { offset: 1, color: 'rgba(0,212,255,0.02)' }
          ])
        }
      }
    ]
  })

  // 堆叠柱归一化
  const keys = ['rainfall', 'temperature', 'sunshine', 'fertilizer', 'irrigation']
  const labels = ['降雨', '气温', '日照', '化肥', '灌溉']
  const normSeries = keys.map((k, idx) => {
    const vals = yearly.map((d) => Number(d[k]))
    return {
      name: labels[idx],
      type: 'bar',
      stack: 'total',
      emphasis: { focus: 'series' },
      data: yearly.map((d, i) => {
        const sum = keys.reduce((s, kk) => s + Number(yearly[i][kk]), 0)
        return Number(((Number(d[k]) / sum) * 100).toFixed(2))
      })
    }
  })
  charts[2].setOption({
    tooltip: { ...darkTooltip, trigger: 'axis', valueFormatter: (v) => v + '%' },
    legend: { textStyle: { color: '#9cb6d0' }, top: 0 },
    grid: { left: 45, right: 20, top: 36, bottom: 28 },
    xAxis: { type: 'category', data: years, ...axisStyle },
    yAxis: { type: 'value', max: 100, ...axisStyle },
    series: normSeries
  })

  // 矩阵微型折线
  const list = wheatRes.data.list
  const byRegion = {}
  for (const r of list) {
    if (!byRegion[r.region_name]) byRegion[r.region_name] = []
    byRegion[r.region_name].push([r.year, r.yield])
  }
  // 再拉全量按年排序 — list可能不全，用 overview + 二次请求不够，改用 factor 不够
  // 用 getWheatList 大 pageSize 已经尽量覆盖；对每个地区排序
  const names = Object.keys(byRegion).slice(0, 18)
  const grid = []
  const xAxis = []
  const yAxis = []
  const series = []
  names.forEach((name, idx) => {
    const row = Math.floor(idx / 6)
    const col = idx % 6
    grid.push({
      left: `${col * 16 + 3}%`,
      top: `${row * 32 + 8}%`,
      width: '14%',
      height: '24%'
    })
    xAxis.push({ type: 'category', gridIndex: idx, show: false, data: byRegion[name].sort((a,b)=>a[0]-b[0]).map(d=>d[0]) })
    yAxis.push({ type: 'value', gridIndex: idx, show: false, scale: true })
    series.push({
      type: 'line',
      xAxisIndex: idx,
      yAxisIndex: idx,
      showSymbol: false,
      data: byRegion[name].sort((a, b) => a[0] - b[0]).map((d) => d[1]),
      lineStyle: { width: 1.5, color: '#00d4ff' },
      areaStyle: { color: 'rgba(0,212,255,0.15)' }
    })
  })
  charts[3].setOption({
    title: names.map((name, idx) => ({
      text: name.replace('市', ''),
      textStyle: { fontSize: 11, color: '#9cb6d0' },
      left: `${(idx % 6) * 16 + 3}%`,
      top: `${Math.floor(idx / 6) * 32 + 2}%`
    })),
    tooltip: { ...darkTooltip, trigger: 'axis' },
    grid,
    xAxis,
    yAxis,
    series
  })
}

function onResize() {
  charts.forEach((c) => c.resize())
}

onMounted(async () => {
  await render()
  window.addEventListener('resize', onResize)
})
onUnmounted(() => {
  window.removeEventListener('resize', onResize)
  charts.forEach((c) => c.dispose())
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
  grid-template-rows: 1fr 1fr;
  gap: 8px;
}
.chart {
  width: 100%;
  height: 100%;
  min-height: 200px;
}
@media (max-width: 900px) {
  .grid {
    grid-template-columns: 1fr;
    grid-template-rows: repeat(4, 260px);
    overflow: auto;
  }
}
</style>
