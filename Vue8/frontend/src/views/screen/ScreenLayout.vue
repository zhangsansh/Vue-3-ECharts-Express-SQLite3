<template>
  <div class="screen">
    <header class="screen-header">
      <div class="left">
        <span class="time">{{ now }}</span>
      </div>
      <h1 class="title">河南省小麦产量分析与预测可视化大屏</h1>
      <div class="right">
        <el-button text @click="$router.push('/admin')">管理后台</el-button>
        <el-button text @click="logout">退出</el-button>
      </div>
    </header>

    <nav class="tabs">
      <router-link
        v-for="t in tabs"
        :key="t.path"
        :to="t.path"
        class="tab"
        :class="{ active: isActive(t) }"
      >
        {{ t.label }}
      </router-link>
    </nav>

    <main class="screen-body">
      <router-view />
    </main>
  </div>
</template>

<script setup>
import { onMounted, onUnmounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'

const route = useRoute()
const router = useRouter()
const store = useUserStore()
const now = ref('')
let timer = null

const tabs = [
  { path: '/screen', label: '地图总览', exact: true },
  { path: '/screen/factors', label: '影响因素分析' },
  { path: '/screen/ml', label: '机器学习预测' },
  { path: '/screen/charts', label: '多维图表' }
]

function isActive(t) {
  if (t.exact) return route.path === '/screen' || route.path.startsWith('/screen/region')
  return route.path.startsWith(t.path)
}

function tick() {
  const d = new Date()
  now.value = d.toLocaleString('zh-CN', { hour12: false })
}

function logout() {
  store.logout()
  router.push('/login')
}

onMounted(() => {
  tick()
  timer = setInterval(tick, 1000)
})
onUnmounted(() => clearInterval(timer))
</script>

<style scoped>
.screen {
  height: 100%;
  display: flex;
  flex-direction: column;
  background:
    radial-gradient(ellipse at top, rgba(0, 100, 160, 0.25), transparent 55%),
    linear-gradient(180deg, #03101c 0%, #071a2e 100%);
  overflow: hidden;
}
.screen-header {
  height: 64px;
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  padding: 0 20px;
  border-bottom: 1px solid rgba(0, 212, 255, 0.25);
  background: linear-gradient(180deg, rgba(0, 60, 100, 0.35), transparent);
}
.title {
  font-family: 'Orbitron', 'Noto Sans SC', sans-serif;
  font-size: clamp(18px, 2.2vw, 28px);
  letter-spacing: 3px;
  background: linear-gradient(90deg, #9ef0ff, #ffe08a);
  -webkit-background-clip: text;
  color: transparent;
  text-align: center;
}
.left .time {
  color: var(--muted);
  font-family: 'Orbitron', monospace;
  font-size: 13px;
}
.right {
  justify-self: end;
  display: flex;
  gap: 4px;
}
.tabs {
  display: flex;
  gap: 8px;
  padding: 8px 16px 4px;
  justify-content: center;
}
.tab {
  padding: 6px 18px;
  border: 1px solid rgba(0, 212, 255, 0.25);
  border-radius: 4px;
  color: #9cb6d0;
  font-size: 13px;
  transition: 0.2s;
}
.tab:hover,
.tab.active {
  color: #fff;
  border-color: var(--cyan);
  background: rgba(0, 180, 220, 0.18);
  box-shadow: 0 0 12px rgba(0, 212, 255, 0.2);
}
.screen-body {
  flex: 1;
  min-height: 0;
  padding: 8px 12px 12px;
}
</style>
