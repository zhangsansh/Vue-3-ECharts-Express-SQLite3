const jwt = require('jsonwebtoken')
const bcrypt = require('bcryptjs')
const { getDb } = require('./db')

const JWT_SECRET = process.env.JWT_SECRET || 'wheat-henan-secret-2024'
const ROLE_LEVEL = { viewer: 1, analyst: 2, admin: 3 }

function signToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username, role: user.role, phone: user.phone },
    JWT_SECRET,
    { expiresIn: '24h' }
  )
}

function authRequired(req, res, next) {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null
  if (!token) return res.status(401).json({ code: 401, message: '未登录' })
  try {
    req.user = jwt.verify(token, JWT_SECRET)
    next()
  } catch {
    return res.status(401).json({ code: 401, message: '登录已过期' })
  }
}

function requireRole(minRole) {
  return (req, res, next) => {
    const level = ROLE_LEVEL[req.user?.role] || 0
    if (level < ROLE_LEVEL[minRole]) {
      return res.status(403).json({ code: 403, message: '权限不足' })
    }
    next()
  }
}

function loginByPassword(username, password) {
  const db = getDb()
  const user = db.prepare('SELECT * FROM users WHERE username = ? AND status = 1').get(username)
  if (!user || !bcrypt.compareSync(password, user.password)) return null
  return user
}

function loginByPhone(phone, password) {
  const db = getDb()
  const user = db.prepare('SELECT * FROM users WHERE phone = ? AND status = 1').get(phone)
  if (!user || !bcrypt.compareSync(password, user.password)) return null
  return user
}

function logOperation(user, action, detail) {
  try {
    getDb()
      .prepare('INSERT INTO operation_logs (user_id, username, action, detail) VALUES (?, ?, ?, ?)')
      .run(user?.id || null, user?.username || '', action, detail || '')
  } catch (_) {}
}

module.exports = {
  signToken,
  authRequired,
  requireRole,
  loginByPassword,
  loginByPhone,
  logOperation,
  ROLE_LEVEL,
  JWT_SECRET
}
