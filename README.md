# SillyTavern Muyu Services

暮羽 Agent 的可选 **SillyTavern 服务端插件**，配合 [SillyTavern Group Director](https://github.com/Windy-Sora/SillyTavern-GroupDirector) 使用。

它为暮羽提供对话文件存储、Brave 联网搜索、公开网页正文读取、本地资料检索、工作区文档草稿与 JSON 语法校验，以及服务自检和脱敏错误记录。

**本仓库不包含聊天界面，也不是前端扩展。不能通过酒馆的「安装扩展」输入本仓库地址来安装。** 未安装时，暮羽仍可正常聊天并使用浏览器 IndexedDB 保存对话；这些可选服务能力不可用。

## 安装

需要 Node.js 20 或更新版本，以及支持服务端插件的 SillyTavern。没有额外运行时依赖，无需执行 `npm install`。

### 1. 下载到服务端插件目录

在 **SillyTavern 根目录**打开终端，运行：

```sh
git clone https://github.com/Windy-Sora/SillyTavern-Muyu-Services.git plugins/gd-muyu-history
```

也可以下载仓库 ZIP，将解压后的文件放入 `plugins/gd-muyu-history/`。不要多嵌套一层文件夹。运行时目录应直接包含：

```text
plugins/gd-muyu-history/
├── package.json
├── index.cjs
├── web-search.cjs
├── web-page.cjs
├── documents.cjs
├── workspace.cjs
├── service-status.cjs
└── diagnostics.cjs
```

README、LICENSE 和 tests 等仓库文件可一并保留。内部插件 ID 为 `gd-muyu-history`，与 GitHub 仓库名称不同。

**已有旧版时请备份并更新原目录，不要另装第二份相同 ID 的插件。**

### 2. 启用并重启酒馆

在 SillyTavern 根目录的 `config.yaml` 中设置：

```yaml
enableServerPlugins: true
```

然后重启 SillyTavern，再刷新网页。仅刷新网页不能加载新服务端代码。

服务端插件具有服务器代码执行能力，请仅安装可信来源。安装目录在运行酒馆的电脑上；通过手机或局域网浏览器访问的用户不需要另装一份。

### 3. 在暮羽中选择要使用的能力

同时更新 Group Director。打开暮羽聊天窗口的齿轮 → **存储与记忆** → **可选服务**，点击「检查服务能力」。

根据需要开启本地资料检索、公开网页正文读取、工作区文档草稿和 JSON 语法校验。这些工具开关默认关闭，开启后从下一任务生效；安装插件或检测能力不会替用户开启它们。

联网搜索在聊天窗口的小地球入口启用，并配置 **Brave Search API 密钥**。Brave 密钥不是模型 API 密钥。公开网页正文读取不需要 Brave 密钥，且与搜索开关独立。

## 功能与边界

### 对话文件存储

对话按 SillyTavern 用户账户隔离，存放在：

```text
<用户数据根目录>/.group-director/muyu/history/<namespace>/<conversation-id>.json
```

这些文件不放在公开可访问的前端扩展目录，也不跟随某个酒馆聊天存档。文件是未加密的 JSON，服务器管理员或有磁盘访问权限的人仍可读取，请自行备份并保护服务器。

- 支持暮羽历史格式 v1–v7；迁入与存储选择由配套客户端处理。
- 每个命名空间最多 64 份有效记录、合计 256 MiB。
- 每份记录最多 32 MiB、4096 条消息；单条文本最多 2 MiB 序列化 UTF-8。
- 更新检查修订号；删除清除正文并保留 ID 删除标记，防止旧浏览器备份重新迁入。
- 使用酒馆提供的账户目录，不接受请求自定义存储目录，也不在身份缺失时回退默认账户。

健康检查通过不等于对话已保存；实际存储状态以暮羽中的结果和回执为准。

### 联网搜索与网页正文

**Brave 搜索**返回标题、摘要和链接，单次 1–10 条结果。搜索词会发送给 Brave，可能消耗其 API 配额；不要输入密钥或私密内容。搜索本身不读取完整网页。

**公开网页正文读取**可按网址读取 UTF-8 HTML／XHTML／纯文本。它不登录、不携带 Cookie 或认证、不执行 JavaScript、不渲染动态页面、不读 PDF，也不解压响应。正文可能包含导航等非文章内容，返回截断标记时不能声称已读齐。

- 仅访问标准端口的公共 HTTP(S) 地址；内网、环回、特殊用途地址和内网域名会被拒绝。
- 每次跳转重新检查 DNS 与实际连接地址；最多 3 次跳转，不允许 HTTPS 降级为 HTTP。
- 网页请求总超时 8 秒、正文最多 1 MiB、返回最多 24000 字符；配套客户端每任务最多 6 次请求（失败也计入）。
- 网页网址会发送到目标网站；搜索或网页资料用于模型回答时，会发送给当前模型。

本服务不把 Brave 密钥写入文件，不记录或回传密钥；客户端是否记住密钥由客户端设置决定。

若代理的 Fake-IP DNS 将公网网站解析为 `198.18.0.0/15` 等保留地址，网页读取会被拒绝。应为目标网站使用真实公网 DNS／real-IP 规则，而不是开放内网访问来绕过检查。

### 本地资料检索

默认资料目录是当前账户的：

```text
<用户数据根目录>/.group-director/muyu/workspace/
```

检索和读取本身不会创建这个目录。支持 UTF-8 的 md/txt/json/js/mjs/cjs/css/html 文件，单文件最多 256 KiB。排除隐藏文件、node_modules 及 settings/secrets/credentials/config 等敏感文件名，拒绝路径穿越和符号链接／junction。

可按目录列文件、做字面量搜索、按内容版本分段读取。搜索最多返回 20 个命中，每个片段最多 500 字符；读取每页最多 8000 字符。文件内容或根配置变化后，旧版本会失效，需要重新获取版本再读取。受限、跳过或空结果不证明完整覆盖。

管理员可在账户私有的 `.group-director/muyu/document-roots.json` 中配置额外只读目录，最多 8 个，路径必须绝对：

```json
{"version":1,"roots":[{"id":"guides","title":"个人指南","path":"E:\\MyDocs\\guides"}]}
```

没有通过 HTTP 添加资料目录的入口。不要批准包含密钥或其他私人资料的目录，不要把私密目录放进可被网页静态访问的扩展目录。

模型获得根 ID、标题、相对路径和版本，而不是服务器磁盘绝对路径。文件内容仍是未可信参考；能读脚本文件不代表可以执行脚本。

### 工作区文档草稿与 JSON 校验

只创建或更新当前账户私有工作区中的平级 md/txt/json 文件，不写管理员额外资料根、脚本、酒馆配置或密钥，也不会把文档自动应用成 GD／ST 配置。

模型先生成包含完整前后内容的草稿。普通模式需要用户逐份确认；全权限模式仍要求明确执行意图。读取授权不等于写入批准，安装服务也不授予写入权限。

- 单份新内容最多 64 KiB；工作区最多 64 个文件、合计 8 MiB。
- 预览前后文本序列化后合计最多 20000 UTF-8 字节；模型工具的新文本另有 12000 字符限制。
- 更新已有文件须取得旧内容版本；预览 5 分钟失效，每账户最多 8 份，重启后失效。
- 提交检查版本并一次性消费预览；旧文件原始字节备份到私有 `workspace-backups/`，最多保留 20 份，不提供自动恢复。
- 结果不明或传输中断时不要盲目重试，应先检查实际文件。服务进程内的串行与版本检查不是跨进程文件系统锁，不要同时用外部编辑器或另一个服务进程修改工作区。

JSON 校验只检查语法、复杂度、危险键和非有限数，不验证 GD／ST 业务合同，不执行代码，也不应用配置。

### 自检与错误记录

「检查服务能力」只查询本机状态，不调用模型或 Brave，也不测试搜索密钥。

存储自检须主动确认，会在账户私有历史目录下创建独立临时目录，写入、读回并清理，不修改真实对话。自检通过不保证未来写入、剩余磁盘容量或真实对话持久化。

错误记录仅覆盖本服务的历史、搜索与存储自检失败，**不是整个 SillyTavern 的 CMD／Console 日志**。记录经过字段限制和脱敏，不保存正文、路径、搜索词、密钥或异常堆栈；保存在内存中，每账户最多 200 条、保留最多 30 分钟，容量压力可能提前淘汰，重启即清空。

暮羽可查看、导出及主动清空这些记录。模型读取仍遵守资料权限，不能清空记录；没有错误记录也不能证明没有发生过问题。

## 更新与排查

Git 安装可在酒馆根目录运行：

```sh
git -C plugins/gd-muyu-history pull --ff-only
```

ZIP 安装请更新全部七个 `.cjs` 文件及 `package.json`，不要只替换 `index.cjs`。两种方式更新后都要重启酒馆；需要新工具时也应更新 Group Director 客户端。

如果暮羽显示服务不可用，依次检查：

1. 是否安装在运行酒馆的那台电脑的 `plugins/` 下，而不是前端 `extensions/`。
2. 插件目录下是否直接包含完整运行时文件，没有额外嵌套。
3. `enableServerPlugins` 是否开启，以及修改后是否已重启酒馆。
4. 在暮羽中重新检查服务能力；需要的工具开关是否已开启。

登录酒馆后可访问 `/api/plugins/gd-muyu-history/health` 检查路由是否加载。它不检查磁盘读写、模型连接或 Brave 密钥。完整能力声明由 `/api/plugins/gd-muyu-history/service/status` 返回。

## 开发参考

所有路由前缀均为 `/api/plugins/gd-muyu-history`，由酒馆提供账户身份：

| 方法 | 路径 | 用途 |
|---|---|---|
| GET | `/health`、`/web/health` | 基础健康检查 |
| GET | `/service/status`、`/service/diagnostics` | 能力与脱敏错误记录 |
| POST | `/service/storage-check`、`/service/diagnostics/clear` | 显式自检／清空记录 |
| GET | `/records`、`/records/:id` | 历史列表与正文（UUID namespace） |
| PUT / DELETE | `/records/:id` | 按修订更新／删除历史 |
| POST | `/web/search`、`/web/page` | 搜索／公开网页正文 |
| POST | `/documents/roots`、`/documents/list`、`/documents/search`、`/documents/read` | 只读资料操作 |
| POST | `/workspace/preview`、`/workspace/apply`、`/workspace/validate` | 草稿／提交／JSON 校验 |

运行测试：

```sh
npm test
```

测试使用 Node 内置测试器和隔离测试数据，不需要真实模型或 Brave 密钥。运行时文件与 Group Director 的 `muyu/server-plugin/` 保持同步，本仓库独立维护安装说明与测试。

MIT License · Copyright (c) 2026 Windy-Sora.
