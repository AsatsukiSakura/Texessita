# Texessita

基于 TypeScript 的多人德州扑克（Texas Hold'em）在线游戏。自托管架构：一人运行服务端，其他人通过浏览器连接即可同台竞技，所有数据存于服务端内存。

## 技术栈

| 层 | 技术 |
|---|---|
| 后端语言 | TypeScript |
| 运行时 | Node.js + tsx |
| 实时通信 | WebSocket (ws) |
| 扑克评估 | poker-evaluator |
| 前端框架 | Vue 3 + Vite |

## 项目结构

```
Texessita/
├── backend/
│   ├── engine/               # 纯扑克引擎（零依赖）
│   │   ├── types.ts          # 花色/点数/牌型/游戏阶段等全部类型
│   │   ├── card.ts           # 牌堆创建/洗牌/发牌
│   │   ├── converter.ts      # Card ↔ poker-evaluator 格式转换
│   │   └── evaluator.ts      # 手牌评估（7选5最优组合）
│   ├── game/                 # 游戏流程控制
│   │   ├── actions.ts        # 行动校验与执行
│   │   ├── round.ts          # 下注轮/盲注/发牌/阶段推进
│   │   ├── showdown.ts       # 摊牌/边池计算/筹码分配
│   │   └── controller.ts     # GameController 编排器
│   ├── network/              # WebSocket 通信层
│   │   ├── protocol.ts       # 消息类型定义（Client↔Server）
│   │   └── server.ts         # WS 服务（超时/心跳/消息路由）
│   ├── types/                # 第三方库类型声明
│   └── index.ts              # 服务端入口
├── frontend/                 # Vue 3 前端（开发中）
└── package.json              # monorepo 根配置
```

## 开发进度

- [x] 基础类型定义（牌/牌型/玩家/游戏状态）
- [x] 扑克工具（创建牌堆/洗牌/发牌）
- [x] 手牌评估器（7选5最优组合）
- [x] 游戏流程控制器（盲注→下注轮→摊牌→边池）
- [x] WebSocket 服务器（消息协议/行动超时/心跳检测）
- [ ] 前端牌桌 UI

## 快速开始

```bash
# 安装依赖
npm install --install-strategy=nested

# 启动后端（WebSocket 服务）
npm run backend:dev
# 服务运行在 ws://localhost:3000
```

## 协议概述

客户端与服务端通过 JSON over WebSocket 通信：

| 客户端 → 服务端 | 说明 |
|---|---|
| `{"type":"join", "name":"..."}` | 加入游戏 |
| `{"type":"start_hand"}` | 开始一局 |
| `{"type":"action", "action":"fold"}` | 弃牌 |
| `{"type":"action", "action":"call"}` | 跟注 |
| `{"type":"action", "action":"raise", "amount":50}` | 加注 |
| `{"type":"action", "action":"all-in"}` | 全下 |

| 服务端 → 客户端 | 说明 |
|---|---|
| `{"type":"joined", "playerId":"..."}` | 加入成功 |
| `{"type":"game_state", "state":{...}}` | 游戏状态同步 |
| `{"type":"your_turn", "callAmount":..., ...}` | 轮到行动 |
| `{"type":"hand_over", "winners":[...]}` | 本局结束 |

详见 [protocol.ts](backend/network/protocol.ts)。

## 许可证

MIT
