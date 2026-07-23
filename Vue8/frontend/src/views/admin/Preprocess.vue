<template>
  <div>
    <div class="toolbar">
      <h2>数据预处理与影响因素分析</h2>
      <div class="btns">
        <el-button @click="resetParams">恢复默认参数</el-button>
        <el-button type="primary" :loading="loading" @click="run">应用参数并训练</el-button>
      </div>
    </div>

    <el-card shadow="never" class="param-card">
      <template #header>模型参数调试</template>
      <el-form label-width="110px">
        <el-form-item label="训练特征">
          <el-checkbox-group v-model="params.features">
            <el-checkbox v-for="(lab, key) in featureLabels" :key="key" :label="key" :value="key">
              {{ lab }}
            </el-checkbox>
          </el-checkbox-group>
        </el-form-item>
        <el-row :gutter="16">
          <el-col :span="8">
            <el-form-item label="训练集比例">
              <el-slider v-model="params.trainRatio" :min="0.5" :max="0.95" :step="0.05" show-input />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="岭回归 λ">
              <el-input-number v-model="params.ridgeLambda" :min="0" :max="100" :step="0.0001" :precision="4" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="异常值阈值">
              <el-input-number v-model="params.outlierZ" :min="1" :max="10" :step="0.5" :precision="1" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="随机种子">
              <el-input-number v-model="params.randomSeed" :min="1" :max="999999" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="年份范围">
              <div style="display: flex; gap: 8px; align-items: center; width: 100%">
                <el-input-number v-model="params.yearFrom" :min="2000" :max="2030" />
                <span>~</span>
                <el-input-number v-model="params.yearTo" :min="2000" :max="2030" />
              </div>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="预处理选项">
              <el-switch v-model="params.standardize" active-text="标准化" style="margin-right: 16px" />
              <el-switch v-model="params.removeOutliers" active-text="剔除异常值" />
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
    </el-card>

    <el-row :gutter="16" v-if="result" style="margin-top: 16px">
      <el-col :span="8">
        <el-card shadow="hover">
          <template #header>预处理结果</template>
          <p>有效样本：{{ result.sampleSize }}（训练 {{ result.trainSize }} / 测试 {{ result.testSize }}）</p>
          <p>异常值：{{ result.preprocessSummary.outlierCount }}</p>
          <p>方法：{{ result.preprocessSummary.method }}</p>
          <p>随机种子：{{ result.params?.randomSeed }}</p>
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card shadow="hover">
          <template #header>模型评估（测试集）</template>
          <p>R²：{{ result.metrics.test.r2 }}</p>
          <p>MAE：{{ result.metrics.test.mae }}</p>
          <p>RMSE：{{ result.metrics.test.rmse }}</p>
          <p>模型：{{ result.model.name }} · λ={{ result.params?.ridgeLambda }}</p>
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card shadow="hover">
          <template #header>训练集指标</template>
          <p>R²：{{ result.metrics.train.r2 }}</p>
          <p>MAE：{{ result.metrics.train.mae }}</p>
          <p>RMSE：{{ result.metrics.train.rmse }}</p>
          <p>特征数：{{ result.features.length }}</p>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="16" style="margin-top: 16px" v-if="result">
      <el-col :span="12">
        <el-card>
          <template #header>影响因素权重</template>
          <div ref="chartRef" style="height: 360px"></div>
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card>
          <template #header>下一年度预测</template>
          <el-table :data="result.nextYearPredictions" height="360" border>
            <el-table-column prop="region_name" label="地区" />
            <el-table-column prop="year" label="预测年" width="90" />
            <el-table-column prop="actual_latest" label="最新实际" />
            <el-table-column prop="predicted_yield" label="预测产量" />
          </el-table>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { onMounted, onUnmounted, reactive, ref } from 'vue'
import * as echarts from 'echarts'
import { mlAnalyze } from '@/api'
import { ElMessage } from 'element-plus'

const featureLabels = {
  rainfall: '降雨量',
  temperature: '气温',
  sunshine: '日照时数',
  fertilizer: '化肥用量',
  pesticide: '农药用量',
  irrigation: '灌溉覆盖率',
  soil_quality: '土壤质量',
  labor_cost: '劳动力成本',
  mechanization: '机械化程度',
  disease_index: '病虫害指数',
  sown_area: '播种面积'
}

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

const loading = ref(false)
const result = ref(null)
const chartRef = ref(null)
let chart = null

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

async function run() {
  if (!params.features.length) {
    ElMessage.warning('请至少选择一个训练特征')
    return
  }
  loading.value = true
  try {
    const res = await mlAnalyze({ ...params })
    result.value = res.data
    ElMessage.success(`分析完成：测试集 R²=${res.data.metrics.test.r2}`)
    requestAnimationFrame(paint)
  } finally {
    loading.value = false
  }
}

function paint() {
  if (!chartRef.value || !result.value) return
  if (!chart) chart = echarts.init(chartRef.value)
  const data = [...result.value.importance].reverse()
  chart.setOption({
    tooltip: { trigger: 'axis' },
    grid: { left: 100, right: 20, top: 20, bottom: 30 },
    xAxis: { type: 'value' },
    yAxis: { type: 'category', data: data.map((d) => d.label) },
    series: [{ type: 'bar', data: data.map((d) => d.weight), itemStyle: { color: '#0a7ea4' } }]
  })
}

onMounted(run)
onUnmounted(() => chart?.dispose())
</script>

<style scoped>
.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}
.btns {
  display: flex;
  gap: 8px;
}
h2 {
  font-size: 20px;
}
.param-card {
  margin-bottom: 8px;
}
p {
  margin: 8px 0;
  color: #334;
}
</style>
