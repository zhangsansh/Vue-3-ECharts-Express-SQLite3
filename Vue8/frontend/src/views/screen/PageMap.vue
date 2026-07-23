<template>
  <div class="page">
    <div class="kpi-row">
      <div class="kpi" v-for="k in kpis" :key="k.label">
        <div class="val">{{ k.value }}</div>
        <div class="lab">{{ k.label }}</div>
      </div>
    </div>
    <div class="main-grid">
      <Panel title="河南省小麦产量分布地图（点击地市进入详情）" class="map-panel">
        <div ref="mapRef" class="chart"></div>
      </Panel>
      <div class="side">
        <Panel title="各地市产量排行">
          <div ref="rankRef" class="chart"></div>
        </Panel>
        <Panel title="全省年均产量趋势">
          <div ref="trendRef" class="chart"></div>
        </Panel>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import * as echarts from 'echarts'
import Panel from '@/components/Panel.vue'
import { useChart, darkTooltip, axisStyle } from '@/components/chartHelper'
import { getOverview } from '@/api'

const router = useRouter()
const mapRef = ref(null)
const rankRef = ref(null)
const trendRef = ref(null)
const overview = ref(null)

const mapChart = useChart(mapRef)
const rankChart = useChart(rankRef)
const trendChart = useChart(trendRef)

const kpis = computed(() => {
  const t = overview.value?.totals || {}
  const y = overview.value?.latestYear || '-'
  const map = overview.value?.mapData || []
  const top = map[0]
  return [
    { label: '数据年份跨度', value: t.min_year ? `${t.min_year}-${t.max_year}` : '-' },
    { label: '最新年份', value: y },
    { label: '全省平均产量(kg/亩)', value: t.avg_yield ?? '-' },
    { label: '产量最高地市', value: top ? `${top.region_name}` : '-' },
    { label: '覆盖地市', value: t.regions ?? '-' }
  ]
})

async function loadMapGeo() {
  const urls = [
    'https://geo.datav.aliyun.com/areas_v3/bound/410000_full.json',
    'https://cdn.jsdelivr.net/npm/echarts@4.9.0/map/json/province/henan.json'
  ]
  for (const url of urls) {
    try {
      const res = await fetch(url)
      if (res.ok) return await res.json()
    } catch (_) {}
  }
  return null
}

function normalizeName(name) {
  return String(name || '')
    .replace(/市$/, '')
    .replace(/地区$/, '')
    .replace(/县$/, '')
}

async function render() {
  const res = await getOverview()
  overview.value = res.data
  const { mapData, yearly, latestYear } = res.data

  // 排行
  rankChart.setOption({
    tooltip: { ...darkTooltip, trigger: 'axis' },
    grid: { left: 70, right: 20, top: 20, bottom: 20 },
    xAxis: { type: 'value', ...axisStyle },
    yAxis: {
      type: 'category',
      data: [...mapData].reverse().map((d) => d.region_name),
      axisLabel: { color: '#9cb6d0', fontSize: 11 }
    },
    series: [
      {
        type: 'bar',
        data: [...mapData].reverse().map((d) => d.yield),
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
            { offset: 0, color: '#0a4d6e' },
            { offset: 1, color: '#00d4ff' }
          ])
        },
        barWidth: 10
      }
    ]
  })

  trendChart.setOption({
    tooltip: { ...darkTooltip, trigger: 'axis' },
    grid: { left: 50, right: 20, top: 30, bottom: 30 },
    xAxis: { type: 'category', data: yearly.map((d) => d.year), ...axisStyle },
    yAxis: { type: 'value', name: 'kg/亩', nameTextStyle: { color: '#9cb6d0' }, ...axisStyle },
    series: [
      {
        type: 'line',
        smooth: true,
        data: yearly.map((d) => d.avg_yield),
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(0,212,255,0.45)' },
            { offset: 1, color: 'rgba(0,212,255,0.02)' }
          ])
        },
        lineStyle: { color: '#00d4ff', width: 2 },
        itemStyle: { color: '#00d4ff' }
      }
    ]
  })

  const geo = await loadMapGeo()
  if (!geo) return

  echarts.registerMap('henan', geo)

  const nameToData = {}
  for (const d of mapData) {
    nameToData[d.region_name] = d
    nameToData[normalizeName(d.region_name)] = d
  }

  const seriesData = (geo.features || []).map((f) => {
    const name = f.properties.name
    const d = nameToData[name] || nameToData[normalizeName(name)]
    return {
      name,
      value: d?.yield ?? 0,
      region_code: d?.region_code,
      region_name: d?.region_name || name
    }
  })

  const chart = mapChart.init()
  mapChart.setOption({
    tooltip: {
      ...darkTooltip,
      formatter: (p) => {
        const d = p.data || {}
        return `${p.name}<br/>产量: ${p.value || '-'} kg/亩<br/>点击查看详情`
      }
    },
    visualMap: {
      min: Math.min(...mapData.map((d) => d.yield)),
      max: Math.max(...mapData.map((d) => d.yield)),
      left: 20,
      bottom: 20,
      text: ['高', '低'],
      textStyle: { color: '#9cb6d0' },
      inRange: { color: ['#0b3a52', '#1a8fb8', '#f0c14b'] },
      calculable: true
    },
    series: [
      {
        name: `${latestYear}年产量`,
        type: 'map',
        map: 'henan',
        roam: true,
        scaleLimit: { min: 0.8, max: 4 },
        label: { show: true, color: '#d9ecff', fontSize: 10 },
        itemStyle: {
          areaColor: '#0a2740',
          borderColor: '#3ecfff',
          borderWidth: 1
        },
        emphasis: {
          label: { color: '#fff' },
          itemStyle: { areaColor: '#1e6f9a' }
        },
        data: seriesData
      }
    ]
  })

  chart.off('click')
  chart.on('click', (params) => {
    const code = params.data?.region_code
    if (code) {
      router.push(`/screen/region/${code}`)
    }
  })
}

function onResize() {
  mapChart.resize()
  rankChart.resize()
  trendChart.resize()
}

onMounted(async () => {
  await render()
  window.addEventListener('resize', onResize)
})
onUnmounted(() => {
  window.removeEventListener('resize', onResize)
  mapChart.dispose()
  rankChart.dispose()
  trendChart.dispose()
})
</script>

<style scoped>
.page {
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.kpi-row {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 8px;
}
.kpi {
  background: rgba(8, 28, 52, 0.75);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 10px 12px;
  text-align: center;
}
.kpi .val {
  font-family: 'Orbitron', monospace;
  font-size: 20px;
  color: var(--gold);
}
.kpi .lab {
  margin-top: 4px;
  font-size: 12px;
  color: var(--muted);
}
.main-grid {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: 1.6fr 1fr;
  gap: 8px;
}
.side {
  display: grid;
  grid-template-rows: 1fr 1fr;
  gap: 8px;
  min-height: 0;
}
.chart {
  width: 100%;
  height: 100%;
  min-height: 180px;
}
.map-panel :deep(.panel-body) {
  height: calc(100% - 36px);
}
@media (max-width: 900px) {
  .kpi-row {
    grid-template-columns: repeat(2, 1fr);
  }
  .main-grid {
    grid-template-columns: 1fr;
  }
}
</style>
