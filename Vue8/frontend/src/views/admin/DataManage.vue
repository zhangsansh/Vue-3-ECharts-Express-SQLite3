<template>
  <div>
    <div class="toolbar">
      <h2>小麦产量数据管理</h2>
      <div class="actions">
        <el-input v-model="query.keyword" placeholder="搜索地区" clearable style="width: 160px" @keyup.enter="load" />
        <el-input v-model="query.year" placeholder="年份" clearable style="width: 100px" />
        <el-button type="primary" @click="load">查询</el-button>
        <el-button v-if="store.isAnalyst" type="success" @click="openEdit()">新增</el-button>
        <el-button v-if="store.isAnalyst" @click="onExport">导出 Excel</el-button>
        <el-upload
          v-if="store.isAnalyst"
          :show-file-list="false"
          :http-request="onImport"
          accept=".xlsx,.xls,.csv"
        >
          <el-button>导入 Excel</el-button>
        </el-upload>
      </div>
    </div>

    <el-table :data="list" border stripe v-loading="loading" style="width: 100%">
      <el-table-column prop="id" label="ID" width="70" />
      <el-table-column prop="region_name" label="地区" width="100" />
      <el-table-column prop="year" label="年份" width="80" />
      <el-table-column prop="yield" label="产量" width="90" />
      <el-table-column prop="sown_area" label="播种面积" width="100" />
      <el-table-column prop="rainfall" label="降雨" width="80" />
      <el-table-column prop="temperature" label="气温" width="80" />
      <el-table-column prop="irrigation" label="灌溉" width="80" />
      <el-table-column prop="fertilizer" label="化肥" width="80" />
      <el-table-column prop="mechanization" label="机械化" width="90" />
      <el-table-column prop="disease_index" label="病虫害" width="90" />
      <el-table-column label="操作" width="160" fixed="right" v-if="store.isAnalyst">
        <template #default="{ row }">
          <el-button link type="primary" @click="openEdit(row)">编辑</el-button>
          <el-button link type="danger" @click="onDelete(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <div class="pager">
      <el-pagination
        background
        layout="total, prev, pager, next"
        :total="total"
        v-model:current-page="query.page"
        :page-size="query.pageSize"
        @current-change="load"
      />
    </div>

    <el-dialog v-model="visible" :title="form.id ? '编辑数据' : '新增数据'" width="640px">
      <el-form :model="form" label-width="100px">
        <el-row :gutter="12">
          <el-col :span="12">
            <el-form-item label="地区代码">
              <el-select v-model="form.region_code" filterable style="width: 100%" @change="onRegionChange">
                <el-option v-for="r in cities" :key="r.code" :label="r.name" :value="r.code" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="年份"><el-input-number v-model="form.year" :min="1990" :max="2100" /></el-form-item>
          </el-col>
          <el-col :span="12" v-for="f in fields" :key="f.key">
            <el-form-item :label="f.label">
              <el-input-number v-model="form[f.key]" :controls="false" style="width: 100%" />
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
      <template #footer>
        <el-button @click="visible = false">取消</el-button>
        <el-button type="primary" @click="save">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useUserStore } from '@/stores/user'
import {
  getWheatList,
  createWheat,
  updateWheat,
  deleteWheat,
  getRegions,
  importWheat,
  exportWheat
} from '@/api'
import axios from 'axios'

const store = useUserStore()
const loading = ref(false)
const list = ref([])
const total = ref(0)
const cities = ref([])
const visible = ref(false)
const query = reactive({ keyword: '', year: '', page: 1, pageSize: 15 })
const fields = [
  { key: 'yield', label: '产量' },
  { key: 'sown_area', label: '播种面积' },
  { key: 'rainfall', label: '降雨量' },
  { key: 'temperature', label: '气温' },
  { key: 'sunshine', label: '日照' },
  { key: 'fertilizer', label: '化肥' },
  { key: 'pesticide', label: '农药' },
  { key: 'irrigation', label: '灌溉' },
  { key: 'soil_quality', label: '土壤质量' },
  { key: 'labor_cost', label: '劳动力成本' },
  { key: 'mechanization', label: '机械化' },
  { key: 'disease_index', label: '病虫害' }
]
const form = reactive({
  id: null,
  region_code: '',
  region_name: '',
  year: 2024,
  yield: 450,
  sown_area: 200,
  rainfall: 600,
  temperature: 15,
  sunshine: 2200,
  fertilizer: 300,
  pesticide: 15,
  irrigation: 70,
  soil_quality: 80,
  labor_cost: 1500,
  mechanization: 75,
  disease_index: 20
})

async function load() {
  loading.value = true
  try {
    const res = await getWheatList(query)
    list.value = res.data.list
    total.value = res.data.total
  } finally {
    loading.value = false
  }
}

function onRegionChange(code) {
  const r = cities.value.find((c) => c.code === code)
  form.region_name = r?.name || ''
}

function openEdit(row) {
  if (row) Object.assign(form, row)
  else {
    Object.assign(form, {
      id: null,
      region_code: cities.value[0]?.code || '',
      region_name: cities.value[0]?.name || '',
      year: 2024,
      yield: 450
    })
  }
  visible.value = true
}

async function save() {
  if (form.id) await updateWheat(form.id, form)
  else await createWheat(form)
  ElMessage.success('保存成功')
  visible.value = false
  load()
}

async function onDelete(row) {
  await ElMessageBox.confirm(`确认删除 ${row.region_name} ${row.year} 年数据？`, '提示')
  await deleteWheat(row.id)
  ElMessage.success('已删除')
  load()
}

async function onImport({ file }) {
  const fd = new FormData()
  fd.append('file', file)
  await importWheat(fd)
  ElMessage.success('导入成功')
  load()
}

async function onExport() {
  const res = await axios.get('/api/wheat/export', {
    responseType: 'blob',
    headers: { Authorization: `Bearer ${store.token}` }
  })
  const url = URL.createObjectURL(res.data)
  const a = document.createElement('a')
  a.href = url
  a.download = 'wheat_data.xlsx'
  a.click()
  URL.revokeObjectURL(url)
}

onMounted(async () => {
  const reg = await getRegions()
  cities.value = reg.data.filter((r) => r.level === 2)
  load()
})
</script>

<style scoped>
.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  flex-wrap: wrap;
  gap: 10px;
}
.actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  align-items: center;
}
.pager {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
}
h2 {
  font-size: 20px;
  color: #123;
}
</style>
