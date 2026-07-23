import { defineStore } from 'pinia'
import { login as loginApi, getMe } from '@/api'

export const useUserStore = defineStore('user', {
  state: () => ({
    token: localStorage.getItem('token') || '',
    user: JSON.parse(localStorage.getItem('user') || 'null')
  }),
  getters: {
    isLogin: (s) => !!s.token,
    role: (s) => s.user?.role || 'viewer',
    isAdmin: (s) => s.user?.role === 'admin',
    isAnalyst: (s) => ['admin', 'analyst'].includes(s.user?.role)
  },
  actions: {
    async login(payload) {
      const res = await loginApi(payload)
      this.token = res.data.token
      this.user = res.data.user
      localStorage.setItem('token', this.token)
      localStorage.setItem('user', JSON.stringify(this.user))
      return res.data
    },
    async fetchMe() {
      if (!this.token) return null
      const res = await getMe()
      this.user = res.data
      localStorage.setItem('user', JSON.stringify(this.user))
      return res.data
    },
    logout() {
      this.token = ''
      this.user = null
      localStorage.removeItem('token')
      localStorage.removeItem('user')
    }
  }
})
