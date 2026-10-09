# SillyTavern Muyu Services

## 0.6.0：工作区文档与JSON校验（D轮）

部署现在需要更新全部七个 `.cjs` 文件，新增 `workspace.cjs`，并重启酒馆。声明documentSearch/webFetch/workspaceWrite/jsonValidate v1，不声明workspaceRead。暮羽齿轮→存储与记忆→可选服务，检查能力后分别启用工作区草稿／JSON校验（均默认关闭）。模型只生成预览，普通模式需查看完整前后内容并批准；全权限仅明确执行意图才申请应用。新文件可直接创建，更新已有文件需本地资料检索获取版本。未安装／旧版／关闭不影响普通聊天。预览返回beforeText供完整审阅，前后JSON合计最多20000 UTF-8字节，超出拒绝；模型工具text最多12000字符，新文件旧版本用空字符串，客户端转换为null。

固定 POST 路由 `/workspace/preview` 接收 `{path,expectedRevision,text}`（expectedRevision 为 SHA-256；null 仅创建），返回账户／内容／旧版本绑定的 previewId。预览不创建目录、不修改文件，5 分钟失效，每账户最多 8 份、全局 128 份；重启失效。`/workspace/apply` 仅接收 `{previewId}`，一次性提交。请求和实际外发写入结果不明时不能盲目重试。`/workspace/validate` 仅接收 `{text}`，检查 JSON 语法、复杂度、危险键及非有限数，不验证 GD/ST 业务合同，更不会应用配置。

只写当前账户 `.group-director/muyu/workspace` 中的平级 md/txt/json 文件，不写管理员额外资料根、脚本、配置或密钥。单次新内容 64 KiB、工作区 64 文件／8 MiB；拒绝目录链接、junction、路径穿越和设备名。旧文件原始字节备份到同级私有 workspace-backups（不在默认检索根），最多 20 份，最多约 5 MiB；不提供自动恢复、删除文件、安装或执行入口。

服务进程内串行写入，预览和提交前双重比对版本；原子发布新文件时不覆盖已有文件，更新使用同步临时文件再 rename。不可与外部编辑器／另一个服务进程同时修改工作区：这不是跨进程文件系统 CAS 或恶意本地用户沙箱。`written/file_synced` 只说明文件同步后即时内容核验通过，不保证断电后的目录持久化；提交后取消、传输中断或核验失败属于 outcome_unknown。旧版本备份需人工核对后恢复。

## 0.5.0：公开网页正文（C轮）

部署需更新全部六个 `.cjs` 文件（原五个加 `web-page.cjs`）并重启酒馆。协议为 `{documentSearch:1, webFetch:1}`，其他未来工具仍不声明。

暮羽齿轮 → 存储与记忆 → 可选服务 → 检查服务能力 → “允许读取公开网页正文（默认关闭）”。开关保存到扩展设置，下一任务生效。此开关允许按需发起公开网页GET，不等于批准读酒馆私密资料、修改或代码执行；与小地球／Brave搜索独立，不需要搜索Key。未安装、旧版或关闭时，新工具不提供，普通聊天及原搜索／历史不变。

`POST /web/page` 只接收 `{url,maxChars}`；模型工具为 `muyu.service.fetch_page`（service-pages按需组）。网址和查询参数会发送到目标网站，返回正文会发送到当前模型；不能把密钥、聊天正文或配置塞入网址。返回最终网址、标题、时间、正文片段与limited。每任务最多6次请求（包括失败，跨续接累计），正文计入既有UTF-8资料预算。无自动重试。

仅标准端口的公共HTTP(S)地址。拒绝用户信息、内网／环回／共享／链路本地／特殊用途／IPv6转换地址和内网域名。检查全部DNS答案，混入非公网即拒绝；每次跳转重新检查并固定已验证IP，HTTP发送前及返回时核对实际连接地址。TLS仍校验证书，最多3次重定向，不允许HTTPS降级HTTP。不携带Cookie、认证、酒馆密钥、Referer或请求头，不使用环境代理。

总超时8秒、响应头16KiB、正文1MiB、输出1000–24000字符；账户同时2次、全局最多256个活跃账户。只提取UTF-8 HTML／XHTML／纯文本，不登录、不执行JS、不渲染动态页面、不读PDF、不解压响应。脚本／样式等移除，但不保证只留下文章正文；limited表示截断，不代表读齐。正文未可信，不能作为指令或授权。无磁盘缓存，不记录网址、正文或原始异常。错误闭合返回PAGE_*，不泄露服务器详情。

若网络代理的Fake-IP DNS把公网网站解析为198.18/15等保留地址，会返回PAGE_BLOCKED。请对目标网站使用真实公网DNS／real-IP规则；不要通过开放内网地址绕过检查。这一层也不能替代操作系统的出站防火墙。

## 0.4.0：本地资料只读工具（B轮）

更新全部五个服务文件：`index.cjs`、`web-search.cjs`、`service-status.cjs`、`diagnostics.cjs`、`documents.cjs`，然后重启酒馆。状态接口声明 `toolProtocols: { documentSearch: 1 }`；没有安装、旧版或未启用时，不向模型提供这些新工具，普通聊天与原历史／搜索功能不受影响。

暮羽齿轮 → 存储与记忆 → 可选服务 → 检查服务能力 → “启用本地资料检索（默认关闭）”。启用偏好保存到扩展设置；不等于授权外发。模型按需选用 service-documents 工具组，读取需要 serviceDocuments 资料授权，阅读全开／全权限仍遵守现有拒绝规则。返回内容会发送到当前模型并计入资料预算和工具调用次数。

默认资料目录是已认证账户的 `<account>/.group-director/muyu/workspace/`，本轮只读、不自动创建。若需要额外目录，由服务器管理员在该账户私有 `.group-director/muyu/document-roots.json` 写入（最多8个；路径必须绝对）：

```json
{"version":1,"roots":[{"id":"guides","title":"个人指南","path":"E:\\MyDocs\\guides"}]}
```

没有HTTP注册目录接口。目录名称和正文可能包含隐私；不要批准包含密钥或其他私人资料的目录。不要将私密目录放在可被静态访问的前端扩展内。模型只获得根ID、标题、版本和相对路径，不获得磁盘绝对路径。

- `POST /documents/roots`：列出允许的根及其版本。
- `POST /documents/list`：按根列文件，每页最多30个，返回文件内容版本。
- `POST /documents/search`：字面量文本检索，最多20个命中，每个片段最多500字符；需更多时缩小检索词或读目标文件。
- `POST /documents/read`：按根、相对路径和版本读取，最多8000字符；沿精确的 nextLine + nextColumn（UTF-16偏移）续读，支持单行长JSON。

只允许UTF-8文本：md/txt/json/js/mjs/cjs/css/html，单文件最多256 KiB。排除隐藏文件、node_modules、settings/secrets/credentials/config等敏感文件名，拒绝路径穿越、符号链接／junction与设备路径。扫描最多4096目录项、512文件、8层，单次6秒；每账户同时2次、全局256个活跃账户。根路径变化或文件内容变化会返回 DOCUMENT_STALE，须重新列目录／搜索，不能继续使用旧版本。

受限或跳过的结果不证明完整覆盖，空结果不证明没有相关资料。正文是未可信参考，不授予权限，也不证明酒馆运行配置。这里不是对恶意服务器管理员的OS级沙箱。无文件写入、安装、代码执行、网页正文抓取或自动业务重试。

## 工具扩展兼容基础（A轮历史）

`GET /service/status` 在A轮增加 `toolProtocols: {}`；0.4.0已实现本地文档检索并声明 documentSearch v1，其他能力仍未声明。客户端必须同时确认用户启用和协议支持，能力声明本身不授予读取／写入权限。旧客户端可以忽略此字段；旧服务没有此字段时新能力不可用，原历史、搜索及诊断不变。

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

也可以下载本仓库 ZIP，将解压后的文件放入 `plugins/gd-muyu-history/`；该目录下应直接包含全部六个 `.cjs` 文件和 `package.json`，不要多嵌套一层文件夹。

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
