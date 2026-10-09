# SillyTavern Muyu Services

## 0.3.0：有界脱敏错误记录

更新全部.cjs（含新增diagnostics.cjs）并重启酒馆；不需要新增依赖。服务加载后仅在内存记录历史、搜索与存储自检失败；每账户最多200条／30分钟，全局256账户／4096条，容量压力可能提前淘汰，重启即清空，不写盘。

字段限事件序号、时间、闭合操作／阶段／错误分类、耗时及可选HTTP状态。不保存路径、账户、对话标识、正文、搜索词、密钥、异常堆栈或响应体。不拦截整个酒馆的Console／CMD，缺失身份时不退回默认账户。用户取消搜索不记录为网络故障；分类不证明根因，空记录不证明从未失败。

- GET /service/diagnostics：按宿主账户读取保留记录。
- POST /service/diagnostics/clear：仅接受 { confirm: true }，只清当前账户记录，不删除对话；新错误继续记录。

暮羽齿轮→存储与记忆→可选服务中检查能力后，可展开记录并本地查看、导出JSON、清空，无模型调用。模型读取使用现有资料授权中的serviceDiagnostics只读来源，不能清空记录。旧版服务不支持此能力，但原有功能不受影响。

## 0.2.0：服务管理与自检

新增 `service-status.cjs`，请更新全部 `.cjs` 文件并重启酒馆，不要只复制index.cjs。旧历史、搜索与health接口不变。

暮羽齿轮→存储与记忆→“可选服务 · 文件历史与联网”提供安装、版本／能力／容量检测。检测仅请求本机，不调用模型或Brave、不启用联网。旧版显示更新提示，不禁用旧功能；无法区分未安装／未启用／未重启。

- `GET /service/status`：版本、能力、历史容量，需有效宿主账户目录，不回传路径、账户或密钥。
- `POST /service/storage-check`：只允许显式 `{ confirm: true }`，拒绝额外字段及自定义目录。

自检必须主动点击，在已认证账户私有history/.service-probes下创建独立随机临时目录，写入、读回并清理；不修改真实对话。每账户同时一次，全局最多256账户。权限／空间／清理失败返回脱敏阶段；清理失败不报告通过。通过不代表真实对话已保存、未来写入必然成功、磁盘剩余容量或搜索密钥有效。浏览器停止等待不保证文件操作取消，服务端继续清理；空探测父目录可能保留。

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

也可以下载本仓库 ZIP，将解压后的文件放入 `plugins/gd-muyu-history/`；该目录下应直接包含全部 `.cjs` 文件（`index.cjs`、`web-search.cjs`、`service-status.cjs`）和 `package.json`，不要多嵌套一层文件夹。

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
