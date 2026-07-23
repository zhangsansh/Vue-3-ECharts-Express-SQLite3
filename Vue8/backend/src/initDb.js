const bcrypt = require('bcryptjs')
const { getDb, initSchema } = require('./db')

const HENAN_CITIES = [
  { code: '410100', name: '郑州市', lng: 113.65, lat: 34.76 },
  { code: '410200', name: '开封市', lng: 114.35, lat: 34.79 },
  { code: '410300', name: '洛阳市', lng: 112.45, lat: 34.62 },
  { code: '410400', name: '平顶山市', lng: 113.19, lat: 33.77 },
  { code: '410500', name: '安阳市', lng: 114.35, lat: 36.10 },
  { code: '410600', name: '鹤壁市', lng: 114.30, lat: 35.75 },
  { code: '410700', name: '新乡市', lng: 113.88, lat: 35.30 },
  { code: '410800', name: '焦作市', lng: 113.24, lat: 35.24 },
  { code: '410900', name: '濮阳市', lng: 115.03, lat: 35.76 },
  { code: '411000', name: '许昌市', lng: 113.85, lat: 34.04 },
  { code: '411100', name: '漯河市', lng: 114.02, lat: 33.58 },
  { code: '411200', name: '三门峡市', lng: 111.19, lat: 34.78 },
  { code: '411300', name: '南阳市', lng: 112.53, lat: 33.00 },
  { code: '411400', name: '商丘市', lng: 115.65, lat: 34.44 },
  { code: '411500', name: '信阳市', lng: 114.07, lat: 32.13 },
  { code: '411600', name: '周口市', lng: 114.65, lat: 33.62 },
  { code: '411700', name: '驻马店市', lng: 114.02, lat: 32.98 },
  { code: '419001', name: '济源市', lng: 112.60, lat: 35.07 }
]

function rand(min, max, digits = 2) {
  return Number((Math.random() * (max - min) + min).toFixed(digits))
}

function seed() {
  const db = getDb()
  initSchema(db)

  const userCount = db.prepare('SELECT COUNT(*) as c FROM users').get().c
  if (userCount === 0) {
    const hash = bcrypt.hashSync('admin123', 10)
    const insertUser = db.prepare(
      'INSERT INTO users (username, password, phone, role, real_name) VALUES (?, ?, ?, ?, ?)'
    )
    insertUser.run('admin', hash, '13800000000', 'admin', '系统管理员')
    insertUser.run('analyst', bcrypt.hashSync('analyst123', 10), '13900000001', 'analyst', '数据分析员')
    insertUser.run('viewer', bcrypt.hashSync('viewer123', 10), '13700000002', 'viewer', '只读用户')
    console.log('默认用户已创建: admin/admin123, analyst/analyst123, viewer/viewer123')
  }

  const regionCount = db.prepare('SELECT COUNT(*) as c FROM regions').get().c
  if (regionCount === 0) {
    db.prepare(
      'INSERT INTO regions (code, name, parent_code, level, longitude, latitude) VALUES (?, ?, ?, ?, ?, ?)'
    ).run('410000', '河南省', null, 1, 113.65, 34.76)

    const insertRegion = db.prepare(
      'INSERT INTO regions (code, name, parent_code, level, longitude, latitude) VALUES (?, ?, ?, ?, ?, ?)'
    )
    for (const city of HENAN_CITIES) {
      insertRegion.run(city.code, city.name, '410000', 2, city.lng, city.lat)
    }
    console.log('河南省行政区划已初始化')
  }

  const dataCount = db.prepare('SELECT COUNT(*) as c FROM wheat_data').get().c
  if (dataCount === 0) {
    const insert = db.prepare(`
      INSERT INTO wheat_data (
        region_code, region_name, year, yield, sown_area, rainfall, temperature,
        sunshine, fertilizer, pesticide, irrigation, soil_quality, labor_cost,
        mechanization, disease_index
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)

    const tx = db.transaction(() => {
      for (const city of HENAN_CITIES) {
        let baseYield = rand(350, 520)
        for (let year = 2010; year <= 2025; year++) {
          const rainfall = rand(400, 900)
          const temperature = rand(12, 18)
          const sunshine = rand(1800, 2600)
          const fertilizer = rand(200, 450)
          const pesticide = rand(5, 25)
          const irrigation = rand(40, 95)
          const soil = rand(60, 95)
          const labor = rand(800, 2500)
          const mech = rand(50, 95)
          const disease = rand(5, 40)

          // 产量受多因素影响的合成模型
          const yieldVal = Math.max(
            200,
            baseYield +
              (year - 2010) * rand(2, 6) +
              (rainfall - 650) * 0.08 +
              (temperature - 15) * 8 +
              (sunshine - 2200) * 0.02 +
              (fertilizer - 300) * 0.15 +
              (irrigation - 70) * 1.2 +
              (soil - 75) * 1.5 -
              (disease - 20) * 2.5 -
              (pesticide - 15) * 0.8 +
              rand(-25, 25)
          )

          insert.run(
            city.code,
            city.name,
            year,
            Number(yieldVal.toFixed(2)),
            rand(80, 450),
            rainfall,
            temperature,
            sunshine,
            fertilizer,
            pesticide,
            irrigation,
            soil,
            labor,
            mech,
            disease
          )
          baseYield += rand(-2, 5)
        }
      }
    })
    tx()
    console.log('小麦产量样本数据已生成')
  }

  const cfg = db.prepare('SELECT COUNT(*) as c FROM system_config').get().c
  if (cfg === 0) {
    const set = db.prepare('INSERT INTO system_config (key, value) VALUES (?, ?)')
    set.run('db_path', require('./db').getDbPath())
    set.run('app_name', '河南省小麦产量分析与预测系统')
    set.run('ml_model', 'multiple_linear_regression')
  }

  console.log('数据库初始化完成')
}

seed()
