const express = require('express')
const bcrypt = require('bcryptjs')
const multer = require('multer')
const XLSX = require('xlsx')
const path = require('path')
const fs = require('fs')
const {
  signToken,
  authRequired,
  requireRole,
  loginByPassword,
  loginByPhone,
  logOperation
} = require('./auth')
const { getDb, setDbPath, getDbPath, initSchema, DATA_DIR } = require('./db')
const { analyzeAndPredict, FEATURE_LABELS, ALL_FEATURES, DEFAULT_FEATURES } = require('./ml')

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } })
const router = express.Router()

// ---------- 认证 ----------
router.post('/auth/login', (req, res) => {
  const { username, password, phone, loginType } = req.body || {}
  let user = null
  if (loginType === 'phone' || phone) {
    if (!phone || !password) return res.status(400).json({ code: 400, message: '请输入手机号和密码' })
    user = loginByPhone(phone, password)
  } else {
    if (!username || !password) return res.status(400).json({ code: 400, message: '请输入用户名和密码' })
    user = loginByPassword(username, password)
  }
  if (!user) return res.status(401).json({ code: 401, message: '账号或密码错误' })
  const token = signToken(user)
  logOperation(user, 'login', `登录成功`)
  res.json({
    code: 0,
    data: {
      token,
      user: {
        id: user.id,
        username: user.username,
        phone: user.phone,
        role: user.role,
        real_name: user.real_name
      }
    }
  })
})

router.get('/auth/me', authRequired, (req, res) => {
  const user = getDb().prepare('SELECT id, username, phone, role, real_name, status FROM users WHERE id = ?').get(req.user.id)
  res.json({ code: 0, data: user })
})

// ---------- 用户管理 ----------
router.get('/users', authRequired, requireRole('admin'), (req, res) => {
  const list = getDb()
    .prepare('SELECT id, username, phone, role, real_name, status, created_at FROM users ORDER BY id')
    .all()
  res.json({ code: 0, data: list })
})

router.post('/users', authRequired, requireRole('admin'), (req, res) => {
  const { username, password, phone, role = 'viewer', real_name } = req.body || {}
  if (!username || !password) return res.status(400).json({ code: 400, message: '用户名和密码必填' })
  if (!['admin', 'analyst', 'viewer'].includes(role)) {
    return res.status(400).json({ code: 400, message: '角色无效' })
  }
  try {
    const hash = bcrypt.hashSync(password, 10)
    const r = getDb()
      .prepare('INSERT INTO users (username, password, phone, role, real_name) VALUES (?, ?, ?, ?, ?)')
      .run(username, hash, phone || null, role, real_name || '')
    logOperation(req.user, 'create_user', `创建用户 ${username}`)
    res.json({ code: 0, data: { id: r.lastInsertRowid } })
  } catch (e) {
    res.status(400).json({ code: 400, message: e.message.includes('UNIQUE') ? '用户名或手机号已存在' : e.message })
  }
})

router.put('/users/:id', authRequired, requireRole('admin'), (req, res) => {
  const id = Number(req.params.id)
  const { phone, role, real_name, status, password } = req.body || {}
  const user = getDb().prepare('SELECT * FROM users WHERE id = ?').get(id)
  if (!user) return res.status(404).json({ code: 404, message: '用户不存在' })

  const next = {
    phone: phone ?? user.phone,
    role: role ?? user.role,
    real_name: real_name ?? user.real_name,
    status: status ?? user.status,
    password: password ? bcrypt.hashSync(password, 10) : user.password
  }
  getDb()
    .prepare(
      `UPDATE users SET phone=?, role=?, real_name=?, status=?, password=?, updated_at=datetime('now','localtime') WHERE id=?`
    )
    .run(next.phone, next.role, next.real_name, next.status, next.password, id)
  logOperation(req.user, 'update_user', `更新用户 ${user.username}`)
  res.json({ code: 0, message: '更新成功' })
})

router.delete('/users/:id', authRequired, requireRole('admin'), (req, res) => {
  const id = Number(req.params.id)
  if (id === req.user.id) return res.status(400).json({ code: 400, message: '不能删除当前登录用户' })
  getDb().prepare('DELETE FROM users WHERE id = ?').run(id)
  logOperation(req.user, 'delete_user', `删除用户 id=${id}`)
  res.json({ code: 0, message: '删除成功' })
})

// ---------- 区域 ----------
router.get('/regions', authRequired, (req, res) => {
  const list = getDb().prepare('SELECT * FROM regions ORDER BY code').all()
  res.json({ code: 0, data: list })
})

// ---------- 小麦数据 CRUD ----------
router.get('/wheat', authRequired, (req, res) => {
  const { region_code, year, page = 1, pageSize = 20, keyword } = req.query
  const where = []
  const params = []
  if (region_code) {
    where.push('region_code = ?')
    params.push(region_code)
  }
  if (year) {
    where.push('year = ?')
    params.push(Number(year))
  }
  if (keyword) {
    where.push('region_name LIKE ?')
    params.push(`%${keyword}%`)
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : ''
  const total = getDb().prepare(`SELECT COUNT(*) as c FROM wheat_data ${whereSql}`).get(...params).c
  const offset = (Number(page) - 1) * Number(pageSize)
  const list = getDb()
    .prepare(`SELECT * FROM wheat_data ${whereSql} ORDER BY year DESC, region_code LIMIT ? OFFSET ?`)
    .all(...params, Number(pageSize), offset)
  res.json({ code: 0, data: { list, total, page: Number(page), pageSize: Number(pageSize) } })
})

router.post('/wheat', authRequired, requireRole('analyst'), (req, res) => {
  const d = req.body || {}
  if (!d.region_code || !d.year) return res.status(400).json({ code: 400, message: '地区和年份必填' })
  try {
    const r = getDb()
      .prepare(
        `INSERT INTO wheat_data (
          region_code, region_name, year, yield, sown_area, rainfall, temperature,
          sunshine, fertilizer, pesticide, irrigation, soil_quality, labor_cost,
          mechanization, disease_index
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
      )
      .run(
        d.region_code,
        d.region_name,
        d.year,
        d.yield,
        d.sown_area,
        d.rainfall,
        d.temperature,
        d.sunshine,
        d.fertilizer,
        d.pesticide,
        d.irrigation,
        d.soil_quality,
        d.labor_cost,
        d.mechanization,
        d.disease_index
      )
    logOperation(req.user, 'create_wheat', `${d.region_name}-${d.year}`)
    res.json({ code: 0, data: { id: r.lastInsertRowid } })
  } catch (e) {
    res.status(400).json({ code: 400, message: e.message.includes('UNIQUE') ? '该地区该年份数据已存在' : e.message })
  }
})

router.put('/wheat/:id', authRequired, requireRole('analyst'), (req, res) => {
  const id = Number(req.params.id)
  const d = req.body || {}
  const row = getDb().prepare('SELECT * FROM wheat_data WHERE id = ?').get(id)
  if (!row) return res.status(404).json({ code: 404, message: '记录不存在' })
  const fields = [
    'region_code',
    'region_name',
    'year',
    'yield',
    'sown_area',
    'rainfall',
    'temperature',
    'sunshine',
    'fertilizer',
    'pesticide',
    'irrigation',
    'soil_quality',
    'labor_cost',
    'mechanization',
    'disease_index'
  ]
  const values = fields.map((f) => (d[f] !== undefined ? d[f] : row[f]))
  getDb()
    .prepare(
      `UPDATE wheat_data SET region_code=?, region_name=?, year=?, yield=?, sown_area=?, rainfall=?,
       temperature=?, sunshine=?, fertilizer=?, pesticide=?, irrigation=?, soil_quality=?,
       labor_cost=?, mechanization=?, disease_index=?, updated_at=datetime('now','localtime') WHERE id=?`
    )
    .run(...values, id)
  logOperation(req.user, 'update_wheat', `id=${id}`)
  res.json({ code: 0, message: '更新成功' })
})

router.delete('/wheat/:id', authRequired, requireRole('analyst'), (req, res) => {
  getDb().prepare('DELETE FROM wheat_data WHERE id = ?').run(Number(req.params.id))
  logOperation(req.user, 'delete_wheat', `id=${req.params.id}`)
  res.json({ code: 0, message: '删除成功' })
})

// ---------- 导入导出 ----------
router.get('/wheat/export', authRequired, requireRole('analyst'), (req, res) => {
  const list = getDb().prepare('SELECT * FROM wheat_data ORDER BY year, region_code').all()
  const ws = XLSX.utils.json_to_sheet(list)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'wheat')
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  res.setHeader('Content-Disposition', 'attachment; filename=wheat_data.xlsx')
  res.send(buf)
})

router.post('/wheat/import', authRequired, requireRole('analyst'), upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ code: 400, message: '请上传文件' })
  try {
    const wb = XLSX.read(req.file.buffer, { type: 'buffer' })
    const sheet = wb.Sheets[wb.SheetNames[0]]
    const rows = XLSX.utils.sheet_to_json(sheet)
    const insert = getDb().prepare(`
      INSERT INTO wheat_data (
        region_code, region_name, year, yield, sown_area, rainfall, temperature,
        sunshine, fertilizer, pesticide, irrigation, soil_quality, labor_cost,
        mechanization, disease_index
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
      ON CONFLICT(region_code, year) DO UPDATE SET
        region_name=excluded.region_name, yield=excluded.yield, sown_area=excluded.sown_area,
        rainfall=excluded.rainfall, temperature=excluded.temperature, sunshine=excluded.sunshine,
        fertilizer=excluded.fertilizer, pesticide=excluded.pesticide, irrigation=excluded.irrigation,
        soil_quality=excluded.soil_quality, labor_cost=excluded.labor_cost,
        mechanization=excluded.mechanization, disease_index=excluded.disease_index,
        updated_at=datetime('now','localtime')
    `)
    let count = 0
    const tx = getDb().transaction((items) => {
      for (const d of items) {
        if (!d.region_code || !d.year) continue
        insert.run(
          String(d.region_code),
          d.region_name || '',
          Number(d.year),
          d.yield,
          d.sown_area,
          d.rainfall,
          d.temperature,
          d.sunshine,
          d.fertilizer,
          d.pesticide,
          d.irrigation,
          d.soil_quality,
          d.labor_cost,
          d.mechanization,
          d.disease_index
        )
        count++
      }
    })
    tx(rows)
    logOperation(req.user, 'import_wheat', `导入 ${count} 条`)
    res.json({ code: 0, data: { count }, message: `成功导入/更新 ${count} 条` })
  } catch (e) {
    res.status(400).json({ code: 400, message: '导入失败: ' + e.message })
  }
})

// ---------- 可视化聚合数据 ----------
router.get('/stats/overview', authRequired, (req, res) => {
  const db = getDb()
  const latestYear = db.prepare('SELECT MAX(year) as y FROM wheat_data').get().y
  const mapData = db
    .prepare(
      `SELECT region_code, region_name, yield, sown_area, rainfall, temperature
       FROM wheat_data WHERE year = ? ORDER BY yield DESC`
    )
    .all(latestYear)
  const yearly = db
    .prepare(
      `SELECT year, ROUND(AVG(yield),2) as avg_yield, ROUND(SUM(sown_area),2) as total_area,
              ROUND(AVG(rainfall),2) as avg_rain, ROUND(AVG(temperature),2) as avg_temp
       FROM wheat_data GROUP BY year ORDER BY year`
    )
    .all()
  const totals = db
    .prepare(
      `SELECT COUNT(*) as records, COUNT(DISTINCT region_code) as regions,
              MIN(year) as min_year, MAX(year) as max_year, ROUND(AVG(yield),2) as avg_yield
       FROM wheat_data`
    )
    .get()
  res.json({ code: 0, data: { latestYear, mapData, yearly, totals } })
})

router.get('/stats/region/:code', authRequired, (req, res) => {
  const code = req.params.code
  const list = getDb()
    .prepare('SELECT * FROM wheat_data WHERE region_code = ? ORDER BY year')
    .all(code)
  if (!list.length) return res.status(404).json({ code: 404, message: '暂无该地区数据' })
  res.json({ code: 0, data: list })
})

router.get('/stats/factor-trend', authRequired, (req, res) => {
  const yearly = getDb()
    .prepare(
      `SELECT year,
        ROUND(AVG(yield),2) as yield,
        ROUND(AVG(rainfall),2) as rainfall,
        ROUND(AVG(temperature),2) as temperature,
        ROUND(AVG(sunshine),2) as sunshine,
        ROUND(AVG(fertilizer),2) as fertilizer,
        ROUND(AVG(irrigation),2) as irrigation,
        ROUND(AVG(soil_quality),2) as soil_quality,
        ROUND(AVG(mechanization),2) as mechanization,
        ROUND(AVG(disease_index),2) as disease_index
       FROM wheat_data GROUP BY year ORDER BY year`
    )
    .all()
  res.json({ code: 0, data: yearly })
})

// ---------- ML 分析与预测 ----------
function runMlAnalyze(options, user) {
  const rows = getDb().prepare('SELECT * FROM wheat_data').all()
  const result = analyzeAndPredict(rows, options)
  const del = getDb().prepare('DELETE FROM predictions')
  const ins = getDb().prepare(
    `INSERT INTO predictions (region_code, region_name, year, predicted_yield, model_name, mae, rmse, r2)
     VALUES (?,?,?,?,?,?,?,?)`
  )
  const tx = getDb().transaction(() => {
    del.run()
    for (const p of result.nextYearPredictions) {
      ins.run(
        p.region_code,
        p.region_name,
        p.year,
        p.predicted_yield,
        result.model.name,
        result.metrics.test.mae,
        result.metrics.test.rmse,
        result.metrics.test.r2
      )
    }
  })
  tx()
  logOperation(user, 'ml_analyze', JSON.stringify(result.params || {}))
  return result
}

router.get('/ml/analyze', authRequired, (req, res) => {
  try {
    const result = runMlAnalyze(req.query, req.user)
    res.json({ code: 0, data: result })
  } catch (e) {
    res.status(500).json({ code: 500, message: e.message })
  }
})

/** POST 支持完整调参体：features / trainRatio / ridgeLambda / outlierZ / standardize / removeOutliers / randomSeed / yearFrom / yearTo */
router.post('/ml/analyze', authRequired, (req, res) => {
  try {
    const result = runMlAnalyze(req.body || {}, req.user)
    res.json({ code: 0, data: result })
  } catch (e) {
    res.status(500).json({ code: 500, message: e.message })
  }
})

router.get('/ml/predictions', authRequired, (req, res) => {
  const list = getDb().prepare('SELECT * FROM predictions ORDER BY predicted_yield DESC').all()
  res.json({ code: 0, data: list })
})

router.get('/ml/labels', authRequired, (req, res) => {
  res.json({
    code: 0,
    data: {
      labels: FEATURE_LABELS,
      allFeatures: ALL_FEATURES,
      defaultFeatures: DEFAULT_FEATURES
    }
  })
})

// ---------- 数据库连接设置 ----------
router.get('/system/db', authRequired, requireRole('admin'), (req, res) => {
  res.json({
    code: 0,
    data: {
      path: getDbPath(),
      dataDir: DATA_DIR,
      exists: fs.existsSync(getDbPath())
    }
  })
})

router.post('/system/db', authRequired, requireRole('admin'), (req, res) => {
  const { path: newPath } = req.body || {}
  if (!newPath) return res.status(400).json({ code: 400, message: '请提供数据库路径' })
  try {
    const dir = path.dirname(newPath)
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    const database = setDbPath(newPath)
    initSchema(database)
    getDb()
      .prepare(
        `INSERT INTO system_config (key, value, updated_at) VALUES ('db_path', ?, datetime('now','localtime'))
         ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at`
      )
      .run(newPath)
    // 若新库为空则提示需要初始化数据
    const c = database.prepare('SELECT COUNT(*) as c FROM wheat_data').get().c
    logOperation(req.user, 'switch_db', newPath)
    res.json({ code: 0, message: '数据库路径已切换', data: { path: newPath, recordCount: c } })
  } catch (e) {
    res.status(400).json({ code: 400, message: '切换失败: ' + e.message })
  }
})

router.get('/system/logs', authRequired, requireRole('admin'), (req, res) => {
  const list = getDb().prepare('SELECT * FROM operation_logs ORDER BY id DESC LIMIT 100').all()
  res.json({ code: 0, data: list })
})

module.exports = router
