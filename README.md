# Texessita

一个基于 TypeScript 的多人在线德州扑克（No-Limit Texas Hold'em）游戏，采用前后端分离的 monorepo 架构。

## 项目简介

Texessita 实现了完整的德州扑克游戏规则，支持最多 9 人同时在线对战。后端包含完整的游戏引擎、逻辑控制和 WebSocket 网络通信，前端基于 Vue 3 + Vite 搭建（开发中）。

## 项目结构

```
Texessita/
├── backend/                 # 后端服务
│   ├── engine/              # 扑克牌引擎（纯计算，零副作用）
│   │   ├── types.ts         #   核心类型定义（牌、牌型、游戏状态等）
│   │   ├── card.ts          #   牌组操作（创建、洗牌、发牌）
│   │   ├── converter.ts     #   Card 对象与 poker-evaluator 格式互转
│   │   └── evaluator.ts     #   手牌评估（C(7,5) 最优 5 张枚举）
│   ├── game/                # 游戏逻辑层
│   │   ├── actions.ts       #   行动校验与执行（纯函数）
│   │   ├── round.ts         #   下注轮管理与阶段推进（纯函数）
│   │   ├── showdown.ts      #   摊牌与边池分配算法（纯函数）
│   │   └── controller.ts    #   GameController 编排器（状态管理）
│   ├── network/             # 网络层
│   │   ├── protocol.ts      #   WebSocket 消息协议类型定义
│   │   └── server.ts        #   WebSocket 服务器（心跳、超时、断线处理）
│   └── index.ts             # 服务入口
├── frontend/                # 前端（Vue 3 + Vite，开发中）
│   └── index.html
├── package.json             # Monorepo 根配置（npm workspaces）
└── tsconfig.json            # TypeScript Project References
```

## 技术栈

| 层面       | 技术                  | 版本    |
| ---------- | --------------------- | ------- |
| 语言       | TypeScript (ESM)      | 5.9.3   |
| 后端运行时 | Node.js + tsx         | -       |
| WebSocket  | ws                    | ^8.21.0 |
| 牌型评估   | poker-evaluator       | ^2.1.1  |
| 前端框架   | Vue 3                 | ^3.5.38 |
| 构建工具   | Vite                  | ^8.0.16 |
| 包管理     | npm workspaces        | -       |

## 核心功能

- **完整德州扑克规则**：支持 Fold / Check / Call / Raise / AllIn 五种操作，Preflop / Flop / Turn / River / Showdown 五个阶段
- **边池分配算法**：正确处理多人 AllIn 场景下的分层边池切分和平局均分
- **最优手牌评估**：枚举 C(7,5)=21 种组合，精确定位最优 5 张牌
- **纯函数式设计**：游戏逻辑层全部采用纯函数，便于测试和推理
- **类型安全协议**：WebSocket 消息使用 TypeScript 联合类型定义，编译期保证类型正确
- **服务器健壮性**：心跳检测、行动超时自动弃牌、断线处理、自动开局
- **单挑模式**：正确处理 2 人对决时的盲注和行动顺序

## 快速开始

### 环境要求

- Node.js >= 18
- npm >= 9

### 安装依赖

```bash
npm install
```

### 启动后端

```bash
npm run backend:dev
```

服务默认运行在 `ws://localhost:3000`，可通过 `PORT` 环境变量修改端口。

### 启动前端

```bash
npm run frontend:dev
```

### 同时启动前后端

```bash
npm run dev
```

## WebSocket 协议

### 客户端 → 服务端

| 消息类型      | 参数                  | 说明       |
| ------------- | --------------------- | ---------- |
| `join`        | `name: string`        | 加入游戏   |
| `start_hand`  | -                     | 开始一局   |
| `action`      | `action, amount?`     | 执行操作   |
| `leave`       | -                     | 离开游戏   |

### 服务端 → 客户端

| 消息类型       | 说明                                   |
| -------------- | -------------------------------------- |
| `joined`       | 加入成功，返回 playerId                |
| `game_state`   | 完整游戏状态快照                       |
| `your_turn`    | 轮到你行动（含可执行操作信息）         |
| `hand_over`    | 牌局结束（赢家 + 最终状态）            |
| `error`        | 错误消息                               |
| `waiting`      | 等待更多玩家加入                       |
| `player_joined`| 新玩家加入通知                         |
| `player_left`  | 玩家离开通知                           |

## 游戏配置

```typescript
{
  maxPlayers: 9,        // 最大玩家数
  startingChips: 1000,  // 起始筹码
  smallBlind: 5,        // 小盲注
  bigBlind: 10,         // 大盲注
}
```

## License

MIT
