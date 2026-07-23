const express = require('express')
const cors = require('cors')
const path = require('path')
require('./initDb')
const routes = require('./routes')

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors())
app.use(express.json({ limit: '20mb' }))
app.use(express.urlencoded({ extended: true }))

app.get('/api/health', (_req, res) => {
  res.json({ code: 0, message: 'ok', time: new Date().toISOString() })
})

app.use('/api', routes)

// 生产环境可托管前端静态资源
const dist = path.join(__dirname, '..', '..', 'frontend', 'dist')
app.use(express.static(dist))
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next()
  const index = path.join(dist, 'index.html')
  res.sendFile(index, (err) => {
    if (err) next()
  })
})

app.use((err, _req, res, _next) => {
  console.error(err)
  res.status(500).json({ code: 500, message: err.message || '服务器错误' })
})

app.listen(PORT, () => {
  console.log(`小麦产量分析后端已启动: http://localhost:${PORT}`)
})
