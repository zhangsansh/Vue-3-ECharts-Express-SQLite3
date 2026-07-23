<template>
  <div class="page" v-loading="loading">
    <div class="head">
      <el-button @click="$router.push('/screen')">← 返回地图</el-button>
      <h2>{{ regionName }} 小麦产量数据可视化</h2>
      <span class="sub">点击地图下钻详情</span>
    </div>
    <div class="kpi-row">
      <div class="kpi" v-for="k in kpis" :key="k.label">
        <div class="val">{{ k.value }}</div>
        <div class="lab">{{ k.label }}</div>
      </div>
    </div>
    <div class="grid">
      <Panel title="历年产量与播种面积">
        <div ref="mainRef" class="chart"></div>
      </Panel>
      <Panel title="气候与农资因素对比（雷达）">
        <div ref="radarRef" class="chart"></div>
      </Panel>
      <Panel title="产量-降雨-气温 三维关系（气泡）">
        <div ref="bubbleRef" class="chart"></div>
      </Panel>
      <Panel title="明细数据">
        <el-table :data="rows" size="small" height="100%" class="dark-table">
          <el-table-column prop="year" label="年份" width="70" />
          <el-table-column prop="yield" label="产量" />
          <el-table-column prop="rainfall" label="降雨" />
          <el-table-column prop="temperature" label="气温" />
          <el-table-column prop="irrigation" label="灌溉" />
          <el-table-column prop="disease_index" label="病虫害" />
        </el-table>
      </Panel>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import * as echarts from 'echarts'
import Panel from '@/components/Panel.vue'
import { useChart, darkTooltip, axisStyle } from '@/components/chartHelper'
import { getRegionStats } from '@/api'

const route = useRoute()
const loading = ref(false)
const rows = ref([])
const mainRef = ref(null)
const radarRef = ref(null)
const bubbleRef = ref(null)
const mainChart = useChart(mainRef)
const radarChart = useChart(radarRef)
const bubbleChart = useChart(bubbleRef)

const regionName = computed(() => rows.value[0]?.region_name || route.params.code)
const kpis = computed(() => {
  if (!rows.value.length) return []
  const yields = rows.value.map((r) => r.yield)
  const latest = rows.value[rows.value.length - 1]
  return [
    { label: '最新产量', value: latest.yield },
    { label: '历史最高', value: Math.max(...yields).toFixed(1) },
    { label: '历史最低', value: Math.min(...yields).toFixed(1) },
    { label: '年均产量', value: (yields.reduce((a, b) => a + b, 0) / yields.length).toFixed(1) }
  ]
})

async function load() {
  loading.value = true
  try {
    const res = await getRegionStats(route.params.code)
    rows.value = res.data
    paint()
  } finally {
    loading.value = false
  }
}

function paint() {
  const years = rows.value.map((r) => r.year)
  mainChart.setOption({
    tooltip: { ...darkTooltip, trigger: 'axis' },
    legend: { textStyle: { color: '#9cb6d0' } },
    grid: { left: 50, right: 50, top: 36, bottom: 28 },
    xAxis: { type: 'category', data: years, ...axisStyle },
    yAxis: [
      { type: 'value', name: '产量', ...axisStyle },
      { type: 'value', name: '面积', ...axisStyle }
    ],
    series: [
      {
        name: '产量',
        type: 'bar',
        data: rows.value.map((r) => r.yield),
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: '#00d4ff' },
            { offset: 1, color: '#0a4d6e' }
          ])
        }
      },
      {
        name: '播种面积',
        type: 'line',
        yAxisIndex: 1,
        data: rows.value.map((r) => r.sown_area),
        itemStyle: { color: '#f0c14b' }
      }
    ]
  })

  const latest = rows.value[rows.value.length - 1]
  radarChart.setOption({
    tooltip: darkTooltip,
    radar: {
      indicator: [
        { name: '降雨', max: 1000 },
        { name: '气温', max: 25 },
        { name: '日照', max: 3000 },
        { name: '化肥', max: 500 },
        { name: '灌溉', max: 100 },
        { name: '土壤', max: 100 },
        { name: '机械化', max: 100 },
        { name: '抗病', max: 100 }
      ],
      axisName: { color: '#9cb6d0' },
      splitLine: { lineStyle: { color: 'rgba(0,212,255,0.15)' } },
      splitArea: { areaStyle: { color: ['rgba(0,40,70,0.3)', 'rgba(0,60,90,0.2)'] } }
    },
    series: [
      {
        type: 'radar',
        data: [
          {
            value: [
              latest.rainfall,
              latest.temperature,
              latest.sunshine,
              latest.fertilizer,
              latest.irrigation,
              latest.soil_quality,
              latest.mechanization,
              100 - latest.disease_index
            ],
            name: latest.year + '年',
            areaStyle: { color: 'rgba(0,212,255,0.25)' },
            lineStyle: { color: '#00d4ff' }
          }
        ]
      }
    ]
  })

  bubbleChart.setOption({
    tooltip: {
      ...darkTooltip,
      formatter: (p) => `${p.data[3]}年<br/>降雨:${p.data[0]} 气温:${p.data[1]} 产量:${p.data[2]}`
    },
    grid: { left: 50, right: 20, top: 20, bottom: 40 },
    xAxis: { name: '降雨', type: 'value', ...axisStyle },
    yAxis: { name: '气温', type: 'value', ...axisStyle },
    series: [
      {
        type: 'scatter',
        data: rows.value.map((r) => [r.rainfall, r.temperature, r.yield, r.year]),
        symbolSize: (val) => Math.max(10, val[2] / 25),
        itemStyle: {
          color: new echarts.graphic.RadialGradient(0.4, 0.3, 1, [
            { offset: 0, color: '#f0c14b' },
            { offset: 1, color: '#0a4d6e' }
          ])
        }
      }
    ]
  })
}

function onResize() {
  mainChart.resize()
  radarChart.resize()
  bubbleChart.resize()
}

watch(() => route.params.code, load)
onMounted(async () => {
  await load()
  window.addEventListener('resize', onResize)
})
onUnmounted(() => {
  window.removeEventListener('resize', onResize)
  mainChart.dispose()
  radarChart.dispose()
  bubbleChart.dispose()
})
</script>

<style scoped>
.page {
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.head {
  display: flex;
  align-items: center;
  gap: 16px;
}
.head h2 {
  font-size: 18px;
  color: #7fe9ff;
}
.sub {
  color: var(--muted);
  font-size: 12px;
}
.kpi-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}
.kpi {
  background: rgba(8, 28, 52, 0.75);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 8px;
  text-align: center;
}
.kpi .val {
  font-family: 'Orbitron', monospace;
  color: var(--gold);
  font-size: 18px;
}
.kpi .lab {
  color: var(--muted);
  font-size: 12px;
}
.grid {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: 1fr 1fr;
  gap: 8px;
}
.chart {
  width: 100%;
  height: 100%;
  min-height: 180px;
}
.dark-table {
  --el-table-bg-color: transparent;
  --el-table-tr-bg-color: transparent;
  --el-table-header-bg-color: rgba(0, 40, 70, 0.5);
  --el-table-row-hover-bg-color: rgba(0, 80, 120, 0.25);
  --el-table-text-color: #d9ecff;
  --el-table-header-text-color: #7fe9ff;
  --el-table-border-color: rgba(0, 212, 255, 0.15);
}
</style>
