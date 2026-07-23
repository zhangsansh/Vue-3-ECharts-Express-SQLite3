# 河南省小麦产量分析与预测可视化系统

基于 **Vue 3 + ECharts + Express + SQLite** 的河南省小麦产量数据管理、影响因素分析、机器学习预测与可视化大屏。

## 功能概览

- 用户登录（账号 / 手机号），角色权限：`admin` / `analyst` / `viewer`
- 前端用户增删改、数据 CRUD、Excel 导入导出、SQLite 路径切换
- 数据预处理（缺失剔除、Z-score、异常值）
- 多元线性回归预测与影响因素重要性分析
- 可视化大屏四页：
  1. **地图总览**：河南省地图，点击地市进入区域大屏
  2. **影响因素分析**：渐变堆叠面积图、大数据量面积图、归一化堆叠柱、矩阵微型折线
  3. **机器学习预测**：重要性、相关性热力、产量预测
  4. **多维图表**：缓动函数、阶梯瀑布、流式渲染+视觉映射、地理等值区划与散点、大规模线图路径

## 快速启动

### 1. 后端

```bash
cd backend
npm install
npm start
```

默认端口：`http://localhost:3001`

### 2. 前端

```bash
cd frontend
npm install
npm run dev
```

默认端口：`http://localhost:5173`

### 演示账号

| 用户名 | 密码 | 角色 | 手机号 |
|--------|------|------|--------|
| admin | admin123 | 管理员 | 13800000000 |
| analyst | analyst123 | 分析员 | 13900000001 |
| viewer | viewer123 | 只读 | 13700000002 |

## 技术栈

- 前端：Vue 3、Vite、Vue Router、Pinia、Element Plus、ECharts
- 后端：Node.js、Express、better-sqlite3、JWT、xlsx
- 数据：SQLite（`backend/data/wheat.db`），含河南省 18 地市 2010–2025 模拟数据

## 目录结构

```
Vue8/
  backend/          # API 与 SQLite
  frontend/         # Vue 可视化与管理后台
```
