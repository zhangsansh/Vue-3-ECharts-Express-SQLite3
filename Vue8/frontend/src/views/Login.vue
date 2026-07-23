<template>
  <div class="login-page">
    <div class="bg-grid"></div>
    <div class="login-card">
      <div class="brand">
        <h1>河南省小麦产量</h1>
        <p>分析 · 预测 · 可视化系统</p>
      </div>
      <el-tabs v-model="loginType" stretch>
        <el-tab-pane label="账号登录" name="account" />
        <el-tab-pane label="手机号登录" name="phone" />
      </el-tabs>
      <el-form :model="form" @keyup.enter="onSubmit">
        <el-form-item v-if="loginType === 'account'">
          <el-input v-model="form.username" placeholder="用户名" prefix-icon="User" size="large" />
        </el-form-item>
        <el-form-item v-else>
          <el-input v-model="form.phone" placeholder="手机号" prefix-icon="Phone" size="large" />
        </el-form-item>
        <el-form-item>
          <el-input
            v-model="form.password"
            type="password"
            show-password
            placeholder="密码"
            prefix-icon="Lock"
            size="large"
          />
        </el-form-item>
        <el-button type="primary" size="large" class="submit" :loading="loading" @click="onSubmit">
          登 录
        </el-button>
      </el-form>
      <div class="tips">
        <p>演示账号：admin / admin123（管理员）</p>
        <p>analyst / analyst123 · viewer / viewer123</p>
        <p>手机号：13800000000 / admin123</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { ElMessage } from 'element-plus'

const router = useRouter()
const store = useUserStore()
const loginType = ref('account')
const loading = ref(false)
const form = reactive({ username: 'admin', password: 'admin123', phone: '13800000000' })

async function onSubmit() {
  loading.value = true
  try {
    await store.login({
      loginType: loginType.value,
      username: form.username,
      phone: form.phone,
      password: form.password
    })
    ElMessage.success('登录成功')
    router.push('/screen')
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-page {
  min-height: 100%;
  display: grid;
  place-items: center;
  position: relative;
  overflow: hidden;
  background:
    radial-gradient(ellipse at 20% 20%, rgba(0, 120, 180, 0.35), transparent 50%),
    radial-gradient(ellipse at 80% 80%, rgba(180, 120, 20, 0.2), transparent 45%),
    linear-gradient(160deg, #04101f 0%, #0a1f38 50%, #061525 100%);
}
.bg-grid {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(0, 212, 255, 0.05) 1px, transparent 1px),
    linear-gradient(90deg, rgba(0, 212, 255, 0.05) 1px, transparent 1px);
  background-size: 48px 48px;
  mask-image: radial-gradient(circle at center, black, transparent 75%);
}
.login-card {
  width: min(420px, 92vw);
  padding: 36px 32px 28px;
  background: rgba(6, 22, 42, 0.88);
  border: 1px solid rgba(0, 212, 255, 0.35);
  border-radius: 12px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.45);
  position: relative;
  z-index: 1;
  backdrop-filter: blur(10px);
}
.brand {
  text-align: center;
  margin-bottom: 18px;
}
.brand h1 {
  font-family: 'Orbitron', 'Noto Sans SC', sans-serif;
  font-size: 26px;
  letter-spacing: 2px;
  color: #7fe9ff;
}
.brand p {
  margin-top: 8px;
  color: var(--muted);
  font-size: 13px;
  letter-spacing: 3px;
}
.submit {
  width: 100%;
  margin-top: 8px;
  background: linear-gradient(90deg, #0a7ea4, #00b4d8);
  border: none;
}
.tips {
  margin-top: 18px;
  font-size: 12px;
  color: var(--muted);
  line-height: 1.7;
}
:deep(.el-tabs__item) {
  color: #9cb6d0;
}
:deep(.el-tabs__item.is-active) {
  color: var(--cyan);
}
</style>
