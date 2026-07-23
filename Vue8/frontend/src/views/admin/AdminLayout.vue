<template>
  <div class="admin">
    <aside class="side">
      <div class="logo">小麦产量系统</div>
      <el-menu :default-active="route.path" router background-color="#071526" text-color="#9cb6d0" active-text-color="#00d4ff">
        <el-menu-item index="/admin/data">数据管理</el-menu-item>
        <el-menu-item index="/admin/preprocess">预处理与分析</el-menu-item>
        <el-menu-item v-if="store.isAdmin" index="/admin/users">用户管理</el-menu-item>
        <el-menu-item v-if="store.isAdmin" index="/admin/db">数据库设置</el-menu-item>
        <el-menu-item index="/screen">返回大屏</el-menu-item>
      </el-menu>
      <div class="user">
        <div>{{ store.user?.real_name || store.user?.username }}</div>
        <div class="role">{{ roleLabel }}</div>
        <el-button size="small" @click="logout">退出</el-button>
      </div>
    </aside>
    <main class="content">
      <router-view />
    </main>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'

const route = useRoute()
const router = useRouter()
const store = useUserStore()
const roleLabel = computed(() => ({ admin: '管理员', analyst: '分析员', viewer: '只读' }[store.role] || store.role))

function logout() {
  store.logout()
  router.push('/login')
}
</script>

<style scoped>
.admin {
  height: 100%;
  display: grid;
  grid-template-columns: 220px 1fr;
  background: #f3f6fa;
  color: #1a2b3c;
}
.side {
  background: #071526;
  color: #fff;
  display: flex;
  flex-direction: column;
}
.logo {
  padding: 20px 16px;
  font-family: 'Orbitron', sans-serif;
  color: #7fe9ff;
  letter-spacing: 1px;
  border-bottom: 1px solid rgba(0, 212, 255, 0.2);
}
.user {
  margin-top: auto;
  padding: 16px;
  border-top: 1px solid rgba(0, 212, 255, 0.2);
  font-size: 13px;
  color: #9cb6d0;
}
.role {
  margin: 4px 0 10px;
  color: #f0c14b;
}
.content {
  overflow: auto;
  padding: 20px;
}
@media (max-width: 800px) {
  .admin {
    grid-template-columns: 1fr;
  }
  .side {
    display: none;
  }
}
</style>
