# 谁是卧底

多人联机网页聚会游戏，使用 Next.js、TypeScript 和 Socket.IO。玩家用昵称加入房间，房主控制流程，支持平民、卧底和白板。

## 本地运行

```bash
npm install
cp .env.example .env
npm run dev
```

打开 `http://localhost:3000`。手机联机测试时，让手机和电脑连同一个 Wi-Fi，然后访问电脑的局域网 IP 和端口。

`.env` 里需要填写自己的 Supabase 数据库密码。`DATABASE_URL` 使用 Transaction pooler，`DIRECT_URL` 使用 Session pooler 或 direct connection，供 Prisma 建表和迁移使用。密码如果包含 `@`、`#`、`%`、`/`、`:`、`?`、`&` 等特殊字符，需要先做 URL 编码。不要把 `.env` 提交到代码仓库。

## 脚本

```bash
npm run typecheck
npm test
npm run build
npm start
npm run db:generate
npm run db:push
npm run db:studio
```

## 部署

首版房间状态存内存，适合 Railway 或 Render 的单实例 Node 服务。多实例部署需要增加共享状态和 Socket.IO Redis adapter。
