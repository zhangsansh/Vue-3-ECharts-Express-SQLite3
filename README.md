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

<img width="2546" height="1411" alt="屏幕截图 2026-07-23 215916" src="https://github.com/user-attachments/assets/29c6e035-0cd3-4e8b-a398-fb160ac99fd1" />
<img width="2557" height="1411" alt="屏幕截图 2026-07-23 215920" src="https://github.com/user-attachments/assets/23034d1d-41be-4251-90d3-d04c29318097" />
<img width="2550" height="1416" alt="屏幕截图 2026-07-23 215924" src="https://github.com/user-attachments/assets/3a74d7cb-8bd1-4983-bdae-05f5a80b04ff" />
<img width="2550" height="1400" alt="屏幕截图 2026-07-23 215930" src="https://github.com/user-attachments/assets/6be5d181-abe1-43e6-8a2d-28c670525c5a" />
<img width="2548" height="1408" alt="屏幕截图 2026-07-23 215936" src="https://github.com/user-attachments/assets/a3251cdf-2df5-4c8c-aa20-23b1fa4e7210" />
<img width="2552" height="1404" alt="屏幕截图 2026-07-23 215941" src="https://github.com/user-attachments/assets/efed9daf-a7b2-470c-a3e6-fc09609252ba" />
<img width="2557" height="1404" alt="屏幕截图 2026-07-23 215949" src="https://github.com/user-attachments/assets/4dc17612-d7f5-4d18-a640-012bed0aa5c0" />
<img width="2532" height="1421" alt="屏幕截图 2026-07-23 215956" src="https://github.com/user-attachments/assets/434a0098-86ba-4849-bf5b-02b1f30f26ed" />
<img width="2548" height="1418" alt="屏幕截图 2026-07-23 220004" src="https://github.com/user-attachments/assets/19684579-848e-446a-a6f5-242d061b26a3" />
<img width="2559" height="1418" alt="屏幕截图 2026-07-23 220009" src="https://github.com/user-attachments/assets/7ca4dbfb-7df0-43b2-a924-091f5dcaa0e3" />


