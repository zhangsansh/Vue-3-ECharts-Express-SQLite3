import http from './http'

export const login = (data) => http.post('/auth/login', data)
export const getMe = () => http.get('/auth/me')

export const getUsers = () => http.get('/users')
export const createUser = (data) => http.post('/users', data)
export const updateUser = (id, data) => http.put(`/users/${id}`, data)
export const deleteUser = (id) => http.delete(`/users/${id}`)

export const getRegions = () => http.get('/regions')
export const getWheatList = (params) => http.get('/wheat', { params })
export const createWheat = (data) => http.post('/wheat', data)
export const updateWheat = (id, data) => http.put(`/wheat/${id}`, data)
export const deleteWheat = (id) => http.delete(`/wheat/${id}`)
export const importWheat = (formData) =>
  http.post('/wheat/import', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
export const exportWheat = () =>
  http.get('/wheat/export', { responseType: 'blob' })

export const getOverview = () => http.get('/stats/overview')
export const getRegionStats = (code) => http.get(`/stats/region/${code}`)
export const getFactorTrend = () => http.get('/stats/factor-trend')

export const mlAnalyze = (params) =>
  params ? http.post('/ml/analyze', params) : http.get('/ml/analyze')
export const getPredictions = () => http.get('/ml/predictions')
export const getMlLabels = () => http.get('/ml/labels')

export const getDbConfig = () => http.get('/system/db')
export const setDbConfig = (data) => http.post('/system/db', data)
export const getLogs = () => http.get('/system/logs')
