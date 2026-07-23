/**
 * 简易多元线性回归 + 数据预处理工具（纯 JS，无需 Python）
 * 支持手动调参：特征、划分比例、岭回归系数、异常值阈值、随机种子、年份范围等
 */

function mean(arr) {
  return arr.reduce((a, b) => a + b, 0) / (arr.length || 1)
}

function std(arr) {
  const m = mean(arr)
  return Math.sqrt(mean(arr.map((x) => (x - m) ** 2))) || 1
}

/** 可复现的伪随机（Mulberry32） */
function createRng(seed) {
  let t = (Number(seed) >>> 0) || 1
  return function next() {
    t += 0x6d2b79f5
    let r = Math.imul(t ^ (t >>> 15), 1 | t)
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r)
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296
  }
}

function shuffleIndices(n, rng) {
  const indices = Array.from({ length: n }, (_, i) => i)
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[indices[i], indices[j]] = [indices[j], indices[i]]
  }
  return indices
}

function preprocess(rows, features, options = {}) {
  const {
    standardize = true,
    outlierZ = 3,
    yearFrom = null,
    yearTo = null,
    regionCode = null
  } = options

  let filtered = rows
  if (yearFrom != null && yearFrom !== '') {
    filtered = filtered.filter((r) => Number(r.year) >= Number(yearFrom))
  }
  if (yearTo != null && yearTo !== '') {
    filtered = filtered.filter((r) => Number(r.year) <= Number(yearTo))
  }
  if (regionCode) {
    filtered = filtered.filter((r) => r.region_code === regionCode)
  }

  const cleaned = filtered.filter(
    (r) =>
      features.every((f) => r[f] != null && !Number.isNaN(Number(r[f]))) &&
      r.yield != null &&
      !Number.isNaN(Number(r.yield))
  )

  const stats = {}
  for (const f of [...features, 'yield']) {
    const vals = cleaned.map((r) => Number(r[f]))
    stats[f] = {
      mean: mean(vals),
      std: std(vals),
      min: Math.min(...vals),
      max: Math.max(...vals)
    }
  }

  const X = cleaned.map((r) =>
    features.map((f) => {
      const v = Number(r[f])
      if (!standardize) return v
      return (v - stats[f].mean) / stats[f].std
    })
  )
  const y = cleaned.map((r) => Number(r.yield))

  const zThreshold = Number(outlierZ) > 0 ? Number(outlierZ) : 3
  const outliers = cleaned
    .map((r, i) => {
      const zs = features.map((f, j) => {
        if (standardize) return Math.abs(X[i][j])
        return Math.abs((Number(r[f]) - stats[f].mean) / stats[f].std)
      })
      return zs.some((z) => z > zThreshold)
        ? { index: i, region: r.region_name, year: r.year, maxZ: Number(Math.max(...zs).toFixed(2)) }
        : null
    })
    .filter(Boolean)

  // 可选：训练前剔除异常值
  let finalCleaned = cleaned
  let finalX = X
  let finalY = y
  if (options.removeOutliers) {
    const drop = new Set(outliers.map((o) => o.index))
    finalCleaned = cleaned.filter((_, i) => !drop.has(i))
    finalX = X.filter((_, i) => !drop.has(i))
    finalY = y.filter((_, i) => !drop.has(i))
  }

  return {
    cleaned: finalCleaned,
    X: finalX,
    y: finalY,
    stats,
    outliers,
    features,
    filteredCount: filtered.length
  }
}

function transpose(m) {
  return m[0].map((_, i) => m.map((row) => row[i]))
}

function matMul(a, b) {
  const bt = transpose(b)
  return a.map((row) => bt.map((col) => row.reduce((s, v, i) => s + v * col[i], 0)))
}

function solveLinearSystem(A, b) {
  const n = A.length
  const M = A.map((row, i) => [...row, b[i]])
  for (let col = 0; col < n; col++) {
    let pivot = col
    for (let r = col + 1; r < n; r++) {
      if (Math.abs(M[r][col]) > Math.abs(M[pivot][col])) pivot = r
    }
    ;[M[col], M[pivot]] = [M[pivot], M[col]]
    const div = M[col][col] || 1e-12
    for (let j = col; j <= n; j++) M[col][j] /= div
    for (let r = 0; r < n; r++) {
      if (r === col) continue
      const factor = M[r][col]
      for (let j = col; j <= n; j++) M[r][j] -= factor * M[col][j]
    }
  }
  return M.map((row) => row[n])
}

function trainLinearRegression(X, y, ridgeLambda = 1e-4) {
  const lambda = Math.max(0, Number(ridgeLambda) || 0)
  const Xb = X.map((row) => [1, ...row])
  const Xt = transpose(Xb)
  const XtX = matMul(Xt, Xb)
  const Xty = Xt.map((row) => row.reduce((s, v, i) => s + v * y[i], 0))
  // 岭回归：不对截距正则（索引 0），其余对角线加 λ
  for (let i = 1; i < XtX.length; i++) XtX[i][i] += lambda
  // 极小值保证数值稳定
  XtX[0][0] += 1e-12
  const weights = solveLinearSystem(XtX, Xty)
  return { intercept: weights[0], coef: weights.slice(1) }
}

function predict(model, X) {
  return X.map((row) => model.intercept + row.reduce((s, v, i) => s + v * model.coef[i], 0))
}

function evaluate(yTrue, yPred) {
  const residuals = yTrue.map((y, i) => y - yPred[i])
  const mae = mean(residuals.map(Math.abs))
  const rmse = Math.sqrt(mean(residuals.map((e) => e ** 2)))
  const ssRes = residuals.reduce((s, e) => s + e ** 2, 0)
  const yMean = mean(yTrue)
  const ssTot = yTrue.reduce((s, y) => s + (y - yMean) ** 2, 0) || 1
  const r2 = 1 - ssRes / ssTot
  return { mae: Number(mae.toFixed(3)), rmse: Number(rmse.toFixed(3)), r2: Number(r2.toFixed(4)) }
}

function featureImportance(model, features, stats) {
  const raw = features.map((f, i) => ({
    feature: f,
    coef: model.coef[i],
    importance: Math.abs(model.coef[i]) * (stats[f]?.std || 1)
  }))
  const total = raw.reduce((s, r) => s + r.importance, 0) || 1
  return raw
    .map((r) => ({
      ...r,
      weight: Number((r.importance / total).toFixed(4)),
      coef: Number(r.coef.toFixed(4))
    }))
    .sort((a, b) => b.weight - a.weight)
}

const FEATURE_LABELS = {
  rainfall: '降雨量',
  temperature: '气温',
  sunshine: '日照时数',
  fertilizer: '化肥用量',
  pesticide: '农药用量',
  irrigation: '灌溉覆盖率',
  soil_quality: '土壤质量',
  labor_cost: '劳动力成本',
  mechanization: '机械化程度',
  disease_index: '病虫害指数',
  sown_area: '播种面积'
}

const ALL_FEATURES = Object.keys(FEATURE_LABELS)

const DEFAULT_FEATURES = [
  'rainfall',
  'temperature',
  'sunshine',
  'fertilizer',
  'irrigation',
  'soil_quality',
  'mechanization',
  'disease_index'
]

function normalizeParams(options = {}) {
  let features = options.features
  if (typeof features === 'string') {
    features = features.split(',').map((s) => s.trim()).filter(Boolean)
  }
  if (!Array.isArray(features) || !features.length) {
    features = [...DEFAULT_FEATURES]
  }
  features = features.filter((f) => ALL_FEATURES.includes(f))
  if (!features.length) features = [...DEFAULT_FEATURES]

  let trainRatio = Number(options.trainRatio)
  if (!Number.isFinite(trainRatio)) trainRatio = 0.8
  trainRatio = Math.min(0.95, Math.max(0.5, trainRatio))

  let ridgeLambda = Number(options.ridgeLambda)
  if (!Number.isFinite(ridgeLambda) || ridgeLambda < 0) ridgeLambda = 0.0001

  let outlierZ = Number(options.outlierZ)
  if (!Number.isFinite(outlierZ) || outlierZ <= 0) outlierZ = 3

  const standardize = options.standardize !== false && options.standardize !== 'false' && options.standardize !== 0
  const removeOutliers =
    options.removeOutliers === true || options.removeOutliers === 'true' || options.removeOutliers === 1

  let randomSeed = Number(options.randomSeed)
  if (!Number.isFinite(randomSeed)) randomSeed = Date.now() % 100000

  const yearFrom = options.yearFrom != null && options.yearFrom !== '' ? Number(options.yearFrom) : null
  const yearTo = options.yearTo != null && options.yearTo !== '' ? Number(options.yearTo) : null
  const regionCode = options.regionCode || null

  return {
    features,
    trainRatio,
    ridgeLambda,
    outlierZ,
    standardize,
    removeOutliers,
    randomSeed,
    yearFrom: Number.isFinite(yearFrom) ? yearFrom : null,
    yearTo: Number.isFinite(yearTo) ? yearTo : null,
    regionCode
  }
}

function analyzeAndPredict(rows, options = {}) {
  const params = normalizeParams(options)
  const { features, trainRatio, ridgeLambda, outlierZ, standardize, removeOutliers, randomSeed, yearFrom, yearTo, regionCode } =
    params

  const { cleaned, X, y, stats, outliers, filteredCount } = preprocess(rows, features, {
    standardize,
    outlierZ,
    removeOutliers,
    yearFrom,
    yearTo,
    regionCode
  })

  if (cleaned.length < 10) {
    throw new Error('有效样本不足（至少需要 10 条），请放宽年份范围或减少筛选条件')
  }

  const split = Math.max(5, Math.floor(cleaned.length * trainRatio))
  const rng = createRng(randomSeed)
  const indices = shuffleIndices(cleaned.length, rng)
  const trainIdx = indices.slice(0, split)
  const testIdx = indices.slice(split)
  if (!testIdx.length) {
    throw new Error('测试集为空，请降低训练集比例')
  }

  const Xtrain = trainIdx.map((i) => X[i])
  const ytrain = trainIdx.map((i) => y[i])
  const Xtest = testIdx.map((i) => X[i])
  const ytest = testIdx.map((i) => y[i])

  const model = trainLinearRegression(Xtrain, ytrain, ridgeLambda)
  const trainPred = predict(model, Xtrain)
  const testPred = predict(model, Xtest)
  const metrics = {
    train: evaluate(ytrain, trainPred),
    test: evaluate(ytest, testPred)
  }

  const importance = featureImportance(model, features, stats).map((item) => ({
    ...item,
    label: FEATURE_LABELS[item.feature] || item.feature
  }))

  const byRegion = {}
  for (const r of cleaned) {
    const key = r.region_code
    if (!byRegion[key] || r.year > byRegion[key].year) byRegion[key] = r
  }

  const nextYearPredictions = Object.values(byRegion).map((r) => {
    const x = features.map((f) => {
      const v = Number(r[f])
      if (!standardize) return v
      return (v - stats[f].mean) / stats[f].std
    })
    const pred = model.intercept + x.reduce((s, v, i) => s + v * model.coef[i], 0)
    return {
      region_code: r.region_code,
      region_name: r.region_name,
      year: Number(r.year) + 1,
      actual_latest: Number(r.yield),
      predicted_yield: Number(Math.max(0, pred).toFixed(2))
    }
  })

  const corrFeatures = [...features, 'yield']
  const correlation = {}
  for (const a of corrFeatures) {
    correlation[a] = {}
    const va = cleaned.map((r) => Number(r[a === 'yield' ? 'yield' : a]))
    const ma = mean(va)
    const sa = std(va)
    for (const b of corrFeatures) {
      const vb = cleaned.map((r) => Number(r[b === 'yield' ? 'yield' : b]))
      const mb = mean(vb)
      const sb = std(vb)
      const cov = mean(va.map((v, i) => (v - ma) * (vb[i] - mb)))
      correlation[a][b] = Number((cov / (sa * sb || 1)).toFixed(3))
    }
  }

  return {
    sampleSize: cleaned.length,
    trainSize: trainIdx.length,
    testSize: testIdx.length,
    outliers,
    stats,
    features,
    featureLabels: FEATURE_LABELS,
    params,
    model: {
      name: ridgeLambda > 0 ? 'ridge_regression' : 'multiple_linear_regression',
      intercept: Number(model.intercept.toFixed(4)),
      coef: model.coef.map((c) => Number(c.toFixed(4))),
      ridgeLambda
    },
    metrics,
    importance,
    nextYearPredictions,
    correlation,
    preprocessSummary: {
      removedNulls: filteredCount - (cleaned.length + (removeOutliers ? outliers.length : 0)),
      outlierCount: outliers.length,
      removeOutliers,
      method: standardize
        ? `Z-score 标准化 + 缺失值剔除${removeOutliers ? ' + 剔除异常值' : ''}`
        : `原始尺度 + 缺失值剔除${removeOutliers ? ' + 剔除异常值' : ''}`
    }
  }
}

module.exports = {
  analyzeAndPredict,
  preprocess,
  FEATURE_LABELS,
  ALL_FEATURES,
  DEFAULT_FEATURES,
  normalizeParams
}
