<template>
  <div>
    <div class="toolbar">
      <h2>用户管理</h2>
      <el-button type="primary" @click="openEdit()">添加用户</el-button>
    </div>
    <el-table :data="list" border stripe>
      <el-table-column prop="id" label="ID" width="70" />
      <el-table-column prop="username" label="用户名" />
      <el-table-column prop="phone" label="手机号" />
      <el-table-column prop="real_name" label="姓名" />
      <el-table-column prop="role" label="角色" width="100">
        <template #default="{ row }">
          <el-tag :type="row.role === 'admin' ? 'danger' : row.role === 'analyst' ? 'warning' : 'info'">
            {{ { admin: '管理员', analyst: '分析员', viewer: '只读' }[row.role] }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="status" label="状态" width="90">
        <template #default="{ row }">
          <el-tag :type="row.status ? 'success' : 'info'">{{ row.status ? '启用' : '停用' }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="created_at" label="创建时间" width="170" />
      <el-table-column label="操作" width="160">
        <template #default="{ row }">
          <el-button link type="primary" @click="openEdit(row)">编辑</el-button>
          <el-button link type="danger" @click="onDelete(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog v-model="visible" :title="form.id ? '编辑用户' : '添加用户'" width="480px">
      <el-form :model="form" label-width="90px">
        <el-form-item label="用户名" v-if="!form.id">
          <el-input v-model="form.username" />
        </el-form-item>
        <el-form-item label="密码">
          <el-input v-model="form.password" type="password" show-password :placeholder="form.id ? '不修改请留空' : ''" />
        </el-form-item>
        <el-form-item label="手机号"><el-input v-model="form.phone" /></el-form-item>
        <el-form-item label="姓名"><el-input v-model="form.real_name" /></el-form-item>
        <el-form-item label="角色">
          <el-select v-model="form.role" style="width: 100%">
            <el-option label="管理员" value="admin" />
            <el-option label="分析员" value="analyst" />
            <el-option label="只读用户" value="viewer" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态" v-if="form.id">
          <el-switch v-model="form.status" :active-value="1" :inactive-value="0" />
        </el-form-item>
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
import { getUsers, createUser, updateUser, deleteUser } from '@/api'

const list = ref([])
const visible = ref(false)
const form = reactive({
  id: null,
  username: '',
  password: '',
  phone: '',
  real_name: '',
  role: 'viewer',
  status: 1
})

async function load() {
  const res = await getUsers()
  list.value = res.data
}

function openEdit(row) {
  if (row) {
    Object.assign(form, { ...row, password: '' })
  } else {
    Object.assign(form, {
      id: null,
      username: '',
      password: '',
      phone: '',
      real_name: '',
      role: 'viewer',
      status: 1
    })
  }
  visible.value = true
}

async function save() {
  if (form.id) {
    const payload = {
      phone: form.phone,
      role: form.role,
      real_name: form.real_name,
      status: form.status
    }
    if (form.password) payload.password = form.password
    await updateUser(form.id, payload)
  } else {
    await createUser(form)
  }
  ElMessage.success('保存成功')
  visible.value = false
  load()
}

async function onDelete(row) {
  await ElMessageBox.confirm(`确认删除用户 ${row.username}？`, '提示')
  await deleteUser(row.id)
  ElMessage.success('已删除')
  load()
}

onMounted(load)
</script>

<style scoped>
.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}
h2 {
  font-size: 20px;
}
</style>
