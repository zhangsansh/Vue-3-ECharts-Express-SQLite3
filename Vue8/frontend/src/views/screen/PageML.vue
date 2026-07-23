<template>
  <div class="page">
    <Panel title="模型参数调试" class="param-panel">
      <div class="param-body">
        <div class="param-row">
          <span class="label">训练特征</span>
          <el-checkbox-group v-model="params.features" class="feat-group">
            <el-checkbox v-for="(lab, key) in featureLabels" :key="key" :label="key" :value="key">
              {{ lab }}
            </el-checkbox>
          </el-checkbox-group>
        </div>
        <div class="param-grid">
          <div class="field">
            <span class="label">训练集比例</span>
            <el-slider v-model="params.trainRatio" :min="0.5" :max="0.95" :step="0.05" show-input :show-input-controls="false" />
          </div>
          <div class="field">
            <span class="label">岭回归 λ</span>
            <el-input-number v-model="params.ridgeLambda" :min="0" :max="100" :step="0.0001" :precision="4" controls-position="right" />
          </div>
          <div class="field">
            <span class="label">异常值 |z| 阈值</span>
            <el-input-number v-model="params.outlierZ" :min="1" :max="10" :step="0.5" :precision="1" controls-position="right" />
          </div>
          <div class="field">
            <span class="label">随机种子</span>
            <el-input-number v-model="params.randomSeed" :min="1" :max="999999" :step="1" controls-position="right" />
          </div>
          <div class="field">
            <span class="label">起始年份</span>
            <el-input-number v-model="params.yearFrom" :min="2000" :max="2030" controls-position="right" />
          </div>
          <div class="field">
            <span class="label">结束年份</span>
            <el-input-number v-model="params.yearTo" :min="2000" :max="2030" controls-position="right" />
          </div>
          <div class="field switch-field">
            <span class="label">Z-score 标准化</span>
            <el-switch v-model="params.standardize" />
          </div>
          <div class="field switch-field">
            <span class="label">剔除异常值</span>
            <el-switch v-model="params.removeOutliers" />
          </div>
        </div>
        <div class="actions">
          <el-button type="primary" :loading="loading" @click="runAnalyze">应用参数并训练</el-button>
          <el-button @click="resetParams">恢复默认</el-button>
          <el-button @click="randomizeSeed">换种子</el-button>
          <span class="meta" v-if="result">
            样本 {{ result.sampleSize }}（训练 {{ result.trainSize }} / 测试 {{ result.testSize }}）
            · R²={{ result.metrics.test.r2 }} · MAE={{ result.metrics.test.mae }} · RMSE={{ result.metrics.test.rmse }}
            · λ={{ result.params?.ridgeLambda }}
          </span>
        </div>
      </div>
    </Panel>

    <div class="grid">
      <Panel title="影响因素重要性">
        <div ref="impRef" class="chart"></div>
      </Panel>
      <Panel title="数据预处理摘要">
        <div class="prep" v-if="result">
          <div class="item"><b>方法</b>{{ result.preprocessSummary.method }}</div>
          <div class="item"><b>异常值</b>{{ result.preprocessSummary.outlierCount }} 条</div>
          <div class="item"><b>模型</b>{{ result.model.name }}</div>
          <div class="item"><b>截距</b>{{ result.model.intercept }}</div>
          <div class="item"><b>特征数</b>{{ result.features.length }} · 种子 {{ result.params?.randomSeed }}</div>
          <el-table :data="result.importance" size="small" height="180" class="dark-table">
            <el-table-column prop="label" label="因素" />
            <el-table-column prop="weight" label="权重" width="80" />
            <el-table-column prop="coef" label="系数" width="80" />
          </el-table>
        </div>
      </Panel>
      <Panel title="下一年度各地市产量预测">
        <div ref="predRef" class="chart"></div>
      </Panel>
      <Panel title="特征相关性热力矩阵">
        <div ref="corrRef" class="chart"></div>
      </Panel>
    </div>
  </div>
</template>

<script setup>
import { onMounted, onUnmounted, reactive, ref } from 'vue'
import * as echarts from 'echarts'
import Panel from '@/components/Panel.vue'
import { useChart, darkTooltip, axisStyle } from '@/components/chartHelper'
import { mlAnalyze } from '@/api'
import { ElMessage } from 'element-plus'

const DEFAULT_FEATURES = [
  'rainfall',
  'temperature',
  'sunshine',
  'fertilizer',
  'irrigation',
  'soil_quality',
  'mechanization',
  'disease_index'
]

const featureLabels = {
  rainfall: '降雨量',
  temperature: '气温',
  sunshine: '日照',
  fertilizer: '化肥',
  pesticide: '农药',
  irrigation: '灌溉',
  soil_quality: '土壤',
  labor_cost: '劳动力',
  mechanization: '机械化',
  disease_index: '病虫害',
  sown_area: '播种面积'
}

const loading = ref(false)
const result = ref(null)
const params = reactive({
  features: [...DEFAULT_FEATURES],
  trainRatio: 0.8,
  ridgeLambda: 0.0001,
  outlierZ: 3,
  randomSeed: 42,
  yearFrom: 2010,
  yearTo: 2025,
  standardize: true,
  removeOutliers: false
})

const impRef = ref(null)
const predRef = ref(null)
const corrRef = ref(null)
const impChart = useChart(impRef)
const predChart = useChart(predRef)
const corrChart = useChart(corrRef)

function resetParams() {
  Object.assign(params, {
    features: [...DEFAULT_FEATURES],
    trainRatio: 0.8,
    ridgeLambda: 0.0001,
    outlierZ: 3,
    randomSeed: 42,
    yearFrom: 2010,
    yearTo: 2025,
    standardize: true,
    removeOutliers: false
  })
}

function randomizeSeed() {
  params.randomSeed = Math.floor(Math.random() * 90000) + 10000
}

function paint() {
  const r = result.value
  if (!r) return

  const imp = [...r.importance].reverse()
  impChart.setOption({
    tooltip: { ...darkTooltip, trigger: 'axis' },
    grid: { left: 90, right: 30, top: 20, bottom: 24 },
    xAxis: { type: 'value', max: 1, ...axisStyle },
    yAxis: { type: 'category', data: imp.map((d) => d.label), axisLabel: { color: '#9cb6d0' } },
    series: [
      {
        type: 'bar',
        data: imp.map((d) => d.weight),
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
            { offset: 0, color: '#8b5a00' },
            { offset: 1, color: '#f0c14b' }
          ])
        }
      }
    ]
  })

  const preds = [...r.nextYearPredictions].sort((a, b) => a.predicted_yield - b.predicted_yield)
  predChart.setOption({
    tooltip: { ...darkTooltip, trigger: 'axis' },
    legend: { data: ['最新实际', '预测产量'], textStyle: { color: '#9cb6d0' } },
    grid: { left: 70, right: 20, top: 36, bottom: 50 },
    xAxis: {
      type: 'category',
      data: preds.map((d) => d.region_name.replace('市', '')),
      axisLabel: { color: '#9cb6d0', rotate: 35, fontSize: 10 }
    },
    yAxis: { type: 'value', ...axisStyle },
    series: [
      {
        name: '最新实际',
        type: 'bar',
        data: preds.map((d) => d.actual_latest),
        itemStyle: { color: 'rgba(0,212,255,0.55)' }
      },
      {
        name: '预测产量',
        type: 'line',
        data: preds.map((d) => d.predicted_yield),
        itemStyle: { color: '#f0c14b' },
        lineStyle: { width: 2 }
      }
    ]
  })

  const keys = Object.keys(r.correlation)
  const labels = keys.map((k) => (k === 'yield' ? '产量' : r.featureLabels[k] || k))
  const data = []
  keys.forEach((a, i) => {
    keys.forEach((b, j) => {
      data.push([j, i, r.correlation[a][b]])
    })
  })
  corrChart.setOption({
    tooltip: {
      ...darkTooltip,
      formatter: (p) => `${labels[p.value[1]]} × ${labels[p.value[0]]}: ${p.value[2]}`
    },
    grid: { left: 80, right: 40, top: 20, bottom: 60 },
    xAxis: { type: 'category', data: labels, axisLabel: { color: '#9cb6d0', rotate: 40, fontSize: 10 } },
    yAxis: { type: 'category', data: labels, axisLabel: { color: '#9cb6d0', fontSize: 10 } },
    visualMap: {
      min: -1,
      max: 1,
      calculable: true,
      orient: 'vertical',
      right: 0,
      top: 'center',
      textStyle: { color: '#9cb6d0' },
      inRange: { color: ['#1b4f72', '#f7f7f7', '#c0392b'] }
    },
    series: [
      {
        type: 'heatmap',
        data,
        label: { show: true, fontSize: 9, color: '#222' },
        emphasis: { itemStyle: { shadowBlur: 8, shadowColor: 'rgba(0,0,0,0.4)' } }
      }
    ]
  })
}

async function runAnalyze() {
  if (!params.features.length) {
    ElMessage.warning('请至少选择一个训练特征')
    return
  }
  if (params.yearFrom > params.yearTo) {
    ElMessage.warning('起始年份不能大于结束年份')
    return
  }
  loading.value = true
  try {
    const res = await mlAnalyze({ ...params })
    result.value = res.data
    paint()
    ElMessage.success(
      `训练完成：R²=${res.data.metrics.test.r2}，MAE=${res.data.metrics.test.mae}`
    )
  } finally {
    loading.value = false
  }
}

function onResize() {
  impChart.resize()
  predChart.resize()
  corrChart.resize()
}

onMounted(async () => {
  await runAnalyze()
  window.addEventListener('resize', onResize)
})
onUnmounted(() => {
  window.removeEventListener('resize', onResize)
  impChart.dispose()
  predChart.dispose()
  corrChart.dispose()
})
</script>

<style scoped>
.page {
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.param-panel {
  flex: 0 0 auto;
}
.param-body {
  padding: 4px 6px 2px;
}
.param-row {
  margin-bottom: 8px;
}
.label {
  display: inline-block;
  color: #7fe9ff;
  font-size: 12px;
  margin-bottom: 4px;
  min-width: 88px;
}
.feat-group {
  display: flex;
  flex-wrap: wrap;
  gap: 2px 8px;
}
.feat-group :deep(.el-checkbox) {
  --el-checkbox-text-color: #cfe6f8;
  --el-checkbox-checked-text-color: #00d4ff;
  margin-right: 0;
}
.param-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px 16px;
  align-items: end;
}
.field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.switch-field {
  flex-direction: row;
  align-items: center;
  gap: 12px;
  padding-top: 18px;
}
.field :deep(.el-slider) {
  padding-right: 12px;
}
.field :deep(.el-input-number) {
  width: 100%;
}
.actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 10px;
}
.meta {
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
  min-height: 160px;
}
.prep {
  color: #cfe6f8;
  font-size: 12px;
  padding: 4px 6px;
}
.prep .item {
  margin-bottom: 4px;
}
.prep b {
  color: var(--cyan);
  margin-right: 8px;
  font-weight: 500;
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
@media (max-width: 1100px) {
  .param-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
