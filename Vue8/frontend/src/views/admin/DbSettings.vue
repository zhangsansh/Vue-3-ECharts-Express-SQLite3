<template>
  <div>
    <h2>数据库连接设置</h2>
    <el-alert
      title="可切换 SQLite 数据库文件路径。切换后若新库为空，请重启后端以重新初始化，或通过导入功能写入数据。"
      type="info"
      show-icon
      :closable="false"
      style="margin: 12px 0 20px"
    />
    <el-form label-width="120px" style="max-width: 720px">
      <el-form-item label="当前路径">
        <el-input v-model="info.path" readonly />
      </el-form-item>
      <el-form-item label="数据目录">
        <el-input v-model="info.dataDir" readonly />
      </el-form-item>
      <el-form-item label="新路径">
        <el-input v-model="newPath" placeholder="例如 C:/data/wheat.db 或相对路径" />
      </el-form-item>
      <el-form-item>
        <el-button type="primary" @click="save">保存并切换</el-button>
        <el-button @click="load">刷新</el-button>
      </el-form-item>
    </el-form>

    <h3 style="margin: 24px 0 12px">操作日志</h3>
    <el-table :data="logs" border stripe max-height="420">
      <el-table-column prop="id" label="ID" width="70" />
      <el-table-column prop="username" label="用户" width="120" />
      <el-table-column prop="action" label="动作" width="140" />
      <el-table-column prop="detail" label="详情" />
      <el-table-column prop="created_at" label="时间" width="170" />
    </el-table>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { getDbConfig, setDbConfig, getLogs } from '@/api'

const info = reactive({ path: '', dataDir: '', exists: false })
const newPath = ref('')
const logs = ref([])

async function load() {
  const res = await getDbConfig()
  Object.assign(info, res.data)
  newPath.value = res.data.path
  const logRes = await getLogs()
  logs.value = logRes.data
}

async function save() {
  const res = await setDbConfig({ path: newPath.value })
  ElMessage.success(res.message + `（记录数: ${res.data.recordCount}）`)
  load()
}

onMounted(load)
</script>

<style scoped>
h2 {
  font-size: 20px;
}
</style>
