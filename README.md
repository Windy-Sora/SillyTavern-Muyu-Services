# SillyTavern Muyu Services

暮羽 Agent 的可选 **SillyTavern 服务端插件**，提供本地对话文件持久化与 Brave 联网搜索。

配合 [SillyTavern Group Director](https://github.com/Windy-Sora/SillyTavern-GroupDirector) 中的暮羽使用。本仓库不包含聊天界面，也不是可以在「安装扩展」中安装的前端扩展。内部插件 ID 保持为 `gd-muyu-history`。

## 安装

需要 Node.js 20 或更新版本，以及支持服务端插件的 SillyTavern。没有额外运行时依赖，无需执行 `npm install`。

在 **SillyTavern 根目录**运行：

```sh
git clone https://github.com/Windy-Sora/SillyTavern-Muyu-Services.git plugins/gd-muyu-history
```

在 SillyTavern 的 `config.yaml` 中启用服务端插件：

```yaml
enableServerPlugins: true
```

重启 SillyTavern，然后在 Group Director 中使用暮羽。服务端插件具有服务器代码执行能力，仅安装可信来源。

也可以下载本仓库 ZIP，将解压后的文件放入 `plugins/gd-muyu-history/`；该目录下应直接包含 `index.cjs`、`web-search.cjs` 和 `package.json`，不要多嵌套一层文件夹。

**已有旧版 `plugins/gd-muyu-history` 时，请备份后更新原目录，不要再安装第二份相同 ID 的插件。** 请同时使用支持对应历史格式的 Group Director 客户端；本版支持历史格式 v1–v7，初始源码与 Group Director 提交 `64f7a54` 对齐。

## 对话文件

数据按 SillyTavern 用户账户隔离，存放在：

```text
<用户数据根目录>/.group-director/muyu/history/<namespace>/<conversation-id>.json
```

这些文件不放在公开可访问的前端扩展目录。文件是未加密的 JSON，服务器管理员或有磁盘访问权限的人仍可读取；请保护服务器并自行备份。API 依赖 SillyTavern 提供的用户身份。

支持酒馆提供的绝对或相对用户目录，包括默认的 `dataRoot: ./data`；相对目录按酒馆进程工作目录解析。不会接受请求指定的文件目录，也不会在用户身份缺失时回退默认账户。更新服务端代码后必须重启酒馆，单独刷新网页不能生效；健康检查成功也不等于历史文件读写成功。

每个命名空间最多 64 份有效记录、合计 256 MiB；每份记录最多 32 MiB、4096 条消息；单条文本最多 2 MiB 序列化 UTF-8。更新使用修订号检查，避免过期写入覆盖新记录。删除清除正文，仅保留 ID 删除标记，防止旧浏览器备份重新迁入。

未安装本插件时，配套客户端可以使用浏览器 IndexedDB 保存历史；安装后的迁入与回退由客户端处理。该服务不会把磁盘目录改为前端可访问目录。

## 联网搜索

在暮羽聊天界面的小地球入口启用搜索，并配置 Brave Search API 密钥。密钥随请求传给服务端，再发送给固定的 Brave 搜索接口；**本插件不将密钥写入文件，不记录或回传密钥**。客户端是否记住密钥由客户端设置决定。

搜索提供标题、摘要和链接，不读取完整网页。单次返回 1–10 条；上游请求超时 12 秒、响应上限 1 MiB，每个用户最多 2 个并发请求。客户端取消或断开时会取消对应上游请求。搜索词会发送给 Brave，请勿包含私密内容；调用可能消耗你的 Brave 配额。

## 更新与检查

```sh
git -C plugins/gd-muyu-history pull --ff-only
```

更新后重启 SillyTavern。也可按宿主配置启用 `enableServerPluginsAutoUpdate`，具体更新行为遵循所用 SillyTavern 版本。

登录 SillyTavern 后，可访问 `/api/plugins/gd-muyu-history/health` 或 `/api/plugins/gd-muyu-history/web/health` 检查路由是否加载。健康检查只证明服务已加载，不能证明 Brave 密钥有效。

服务路由前缀为 `/api/plugins/gd-muyu-history`：

- `GET /health`、`GET /web/health`：服务状态。
- `GET /records`、`GET /records/:id`：历史列表与正文，需 UUID `namespace` 查询参数。
- `PUT /records/:id`：提交 `{ record, expectedRevision }`。
- `DELETE /records/:id`：提交 `{ revision }`。
- `POST /web/search`：Brave 搜索，由配套客户端调用。

## 开发

```sh
npm test
```

基础测试使用 Node 内置测试器，搜索请求使用模拟接口，不消耗额度、不需要真实密钥。运行时文件来自 Group Director 的 `muyu/server-plugin/`，本仓库独立维护安装文档与基础测试。

MIT License · Copyright (c) 2026 Windy-Sora.
