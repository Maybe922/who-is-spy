# 2026-05-28 下午进展总结

## 本次目标

在 Codex 完成基础重构（账号系统 + Supabase 接入）之后，继续推进平台化路线：
调整路由结构、打通账号与游戏身份关联、搭建 AI 词库生成基础设施。

---

## 路由结构重组

### 问题

原先根路径 `/` 是游戏页（谁是卧底创建/加入房间），大厅 `/lobby` 要求强制登录。
用户直接访问 `localhost:3000` 看到的是游戏页，而非平台大厅，体验错位。

### 改动

| 路径 | 改动前 | 改动后 |
|------|--------|--------|
| `/` | 谁是卧底游戏页（昵称 + 创建/加入房间） | 游戏大厅（平台入口） |
| `/play` | 不存在 | 谁是卧底游戏页（原 `/` 内容） |
| `/lobby` | 强制登录的大厅 | 重定向到 `/`（保留路径兼容性） |

- `app/page.tsx`：改为服务端组件，渲染游戏大厅，读取当前登录用户状态
- `app/play/page.tsx`：原游戏页迁移至此，"返回大厅"链接改为指向 `/`
- `app/lobby/page.tsx`：改为 `redirect("/")`
- `app/auth-form.tsx`：登录/注册成功后跳转从 `/lobby` 改为 `/`
- `/play` 内"新标签加入测试"链接从 `/?newPlayer=1` 改为 `/play?newPlayer=1`

### 大厅页设计

- 未登录：顶部显示登录 / 注册按钮，黄色提示条引导注册（不强制）
- 已登录：顶部显示用户显示名 + 退出登录按钮
- 游戏卡片区：谁是卧底（链接到 `/play`）+ 预留更多游戏位置

---

## 账号与游戏身份关联

### 问题

进入 `/play` 后昵称栏为空，已登录用户需要手动再输一次名字。

### 改动

`app/play/page.tsx` 在 mount 时请求 `/api/auth/me`：

- 已登录：取 `displayName`（优先）或 `username` 自动填入昵称，输入框变为只读（灰色），提示"来自你的账号"
- 未登录：输入框正常可编辑

---

## 密码最低位数调整

将最低密码长度从 8 位降至 3 位：

- `lib/auth-core.ts`：`validatePassword` 中 `< 8` 改为 `< 3`
- `app/auth-form.tsx`：placeholder 从"至少 8 位"改为"至少 3 位"

---

## AI 基础设施搭建

为后续「房间内按主题生成词对」功能奠定基础。

### 安装依赖

```bash
npm install openai @anthropic-ai/sdk
```

支持 OpenAI 兼容（OpenAI、DeepSeek、Groq、月之暗面、Ollama）和 Anthropic 两种接口。

### 新增文件

**`lib/aiTypes.ts`**

```typescript
export type AiProviderType = "openai-compatible" | "anthropic";
export type AiConfig = { providerType, baseUrl, apiKey, model };
export const AI_CONFIG_KEY = "who-is-spy:ai-config";
```

**`lib/aiClient.ts`**

统一调用入口，根据 `providerType` 路由到 OpenAI SDK 或 Anthropic SDK，支持 `maxTokens` 参数。

**`app/settings/page.tsx`**（`/settings`）

AI 配置页，功能：
- 接口类型切换（OpenAI 兼容 / Anthropic）
- 快捷预设：OpenAI、DeepSeek、Groq、月之暗面、Ollama 本地、自定义
- API 地址、API Key（password 类型）、模型名称输入
- 模型快捷选择芯片
- 保存到浏览器 `localStorage`（Key 不上传服务器存储）
- 测试连接按钮

**`app/api/ai/test/route.ts`**（`POST /api/ai/test`）

测试连接接口，发送简单 ping 给 AI，返回 `{ ok, message }`。

### 大厅入口

`app/page.tsx` 游戏卡片区右上角加了"AI 配置 →"跳转链接。

---

## 当前路由总览

```
/               游戏大厅（平台首页，无需登录）
/play           谁是卧底游戏（昵称 + 创建/加入房间 + 游戏全流程）
/login          登录
/register       注册
/settings       AI 配置（接口类型、Key、模型）
/lobby          → 重定向到 /
/api/auth/*     注册、登录、退出、当前用户
/api/ai/test    AI 连接测试
```

---

## 下一步

1. **房间内 AI 生成词对**：房主在等待大厅输入主题（如"小时候的动画片"），调用 AI 生成约 20 个词对，通过 Socket 下发到房间，游戏开始时使用这批词
2. **词库持久化**（可选）：把生成的词对存入 `word_packs` / `word_pairs` 表供复用
3. **题库管理页面**：查看、编辑、启用/禁用已有词对
