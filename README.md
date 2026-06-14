# Texessita

基于 TypeScript 的多人德州扑克（Texas Hold'em）在线游戏。

## 技术栈

| 层 | 技术 |
|---|------|
| 后端语言 | TypeScript |
| 运行时 | Node.js + tsx |
| 实时通信 | WebSocket (ws) |
| 扑克评估 | poker-evaluator |
| 前端框架 | Vue 3 + Vite |

## 项目结构

```
Texessita/
├── backend/
│   ├── engine/          # 纯扑克引擎
│   │   ├── types.ts     # 花色/点数/牌型/游戏阶段等全部类型
│   │   ├── card.ts      # 牌堆创建/洗牌/发牌
│   │   ├── converter.ts # Card ↔ poker-evaluator 格式转换
│   │   └── evaluator.ts # 手牌评估（最优5张）与比较
│   ├── game/            # 游戏流程控制
│   │   ├── actions.ts   # 玩家行动校验与执行（fold/check/call/raise/all-in）
│   │   ├── round.ts     # 下注轮管理/盲注/发牌/阶段推进
│   │   ├── showdown.ts  # 摊牌/边池计算/筹码分配
│   │   └── controller.ts# GameController 编排器
│   └── types/           # 第三方库类型声明
├── frontend/            # Vue 3 前端（开发中）
└── package.json         # monorepo 根配置
```

## 开发进度

- [x] 基础类型定义（牌/牌型/玩家/游戏状态）
- [x] 扑克工具（创建牌堆/洗牌/发牌）
- [x] 手牌评估器（7选5最优组合/胜负比较）
- [x] 游戏流程控制器（盲注→下注轮→摊牌→边池）
- [ ] WebSocket 服务器
- [ ] 前端牌桌 UI

## 快速开始

```bash
# 安装依赖
npm install

# 启动开发服务（后端 + 前端）
npm run dev
```

## 许可证

MIT
