# SillyTavern Muyu Services

[简体中文](README.md) | [English](README_EN.md)

An optional **SillyTavern server plugin** for Muyu Agent, shared by [SillyTavern GroupDirector](https://github.com/Windy-Sora/SillyTavern-GroupDirector) and [SillyTavern GroupWorld](https://github.com/Windy-Sora/SillyTavern-GroupWorld). Either client uses the same service installation.

It adds conversation file storage, Brave web search, public web-page text retrieval, local document search, workspace document drafts and JSON syntax validation, plus service checks and sanitized error records.

**This repository does not include a chat interface and is not a frontend extension. You cannot install it by entering its URL in SillyTavern's “Install extension” dialog.** Without it, Muyu's basic chat and core client features remain available. History can also use browser, account-settings or world-book storage supported by the client; only the extra capabilities provided by this service are unavailable.

## Two clients, one service

- Choose GroupDirector or GroupWorld and **enable only one of them**. Install the shared server plugin in `plugins/gd-muyu-history/`; no separate GroupWorld service is needed.
- The plugin ID `gd-muyu-history`, API prefix `/api/plugins/gd-muyu-history` and data directory `.group-director/muyu/` are shared compatibility identifiers. Do not rename them to GW or create a second set of directories when using GroupWorld.
- Within the same Tavern account, both clients may use the same history namespace and files. Switching product names does not provide isolated storage. Back up before switching, retain existing archives, and do not enable both frontends or load duplicate services with the same ID.
- Tool availability depends on client support, the service capability protocol, feature switches and permissions—not matching repository version numbers. After updating the service, check its capabilities again in your chosen client.

If you explicitly select the service plugin as your history read source, an unavailable service produces a storage error rather than silently loading a different history library. You can choose another read source in the client. Installing this service does not grant permission to read data, write files or execute code.

## Installation

Requires Node.js 20 or newer and a SillyTavern installation that supports server plugins. There are no additional runtime dependencies; `npm install` is not required.

### 1. Download into the server plugin directory

Open a terminal in the **SillyTavern root directory** and run:

```sh
git clone https://github.com/Windy-Sora/SillyTavern-Muyu-Services.git plugins/gd-muyu-history
```

Alternatively, download the repository ZIP and place its extracted files in `plugins/gd-muyu-history/`. Avoid an extra nested directory. The runtime files must be directly inside:

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

Repository files such as the READMEs, LICENSE and tests may remain alongside them. The internal plugin ID is `gd-muyu-history`, which differs from the GitHub repository name.

**If an older version is already installed, back it up and update that directory. Do not install a second copy with the same plugin ID.**

### 2. Enable server plugins and restart Tavern

In `config.yaml` in the SillyTavern root directory, set:

```yaml
enableServerPlugins: true
```

Restart SillyTavern, then refresh the browser. Refreshing the page alone does not load new server code.

Server plugins can execute code on the server, so install only trusted code. Install this plugin on the computer running Tavern; users connecting from a phone or another LAN browser do not need a separate installation.

### 3. Choose capabilities in Muyu

Update your chosen GroupDirector or GroupWorld client. In Muyu's chat window, open the gear → **Storage & Memory** → **Optional services**, then select **Check service capabilities**. You do not need to install the other frontend.

Enable local document search, public web-page retrieval, workspace document drafts and JSON validation as needed. These tool switches are off by default and take effect from the next task. Installing the plugin or checking capabilities does not enable them for you.

Enable web search through the globe control in the chat window and configure a **Brave Search API key**. This is not your model API key. Public web-page retrieval does not require a Brave key and has its own switch, independent of search.

## Features and boundaries

### Conversation file storage

Conversations are isolated by SillyTavern user account and stored in:

```text
<user data root>/.group-director/muyu/history/<namespace>/<conversation-id>.json
```

These files are not stored in the publicly served frontend extension directory and are not attached to an individual Tavern chat archive. They are unencrypted JSON: server administrators and anyone with disk access can still read them. Protect your server and maintain backups.

- Supports Muyu history formats v1–v7. Migration and storage selection are handled by the companion client.
- Up to 64 valid records and 256 MiB in total per namespace.
- Up to 32 MiB and 4096 messages per record; each text field is limited to 2 MiB of serialized UTF-8.
- Updates check revision numbers. Deletion removes the record body and retains an ID tombstone to prevent old browser backups from importing it again.
- Uses account directories supplied by Tavern. Requests cannot choose arbitrary storage paths, and missing identity never falls back to a default account.

A successful health check does not mean a conversation was saved. Use the actual storage results and receipts shown in Muyu.

### Web search and page text

**Brave search** returns titles, snippets and links, with 1–10 results per request. Queries are sent to Brave and may consume your API quota; do not include keys or private information. Search itself does not retrieve complete web pages.

**Public web-page retrieval** reads UTF-8 HTML, XHTML or plain text from a URL. It does not log in, send cookies or authentication, execute JavaScript, render dynamic pages, read PDFs or decompress responses. Returned text may include navigation and other non-article content. A truncation marker means the page has not been read in full.

- Only public HTTP(S) addresses on standard ports are allowed. Private, loopback and special-use addresses, as well as internal domain names, are rejected.
- DNS and the actual connection address are checked again at every redirect. At most 3 redirects are allowed, with no HTTPS-to-HTTP downgrade.
- Each page request has an 8-second total timeout, a 1 MiB body limit and a 24000-character returned-text limit. The companion client allows at most 6 page requests per task, including failed attempts.
- Page URLs are sent to the target website. Search results or page text used in an answer are sent to the currently selected model.

The service does not write Brave keys to files or include them in diagnostic records or responses. Whether a key is remembered is controlled by client settings.

If a proxy's Fake-IP DNS resolves a public website to a reserved range such as `198.18.0.0/15`, page retrieval rejects it. Configure real public DNS/real-IP rules for the target website rather than bypassing the checks by allowing private-network access.

### Local document search

The default document directory belongs to the current account:

```text
<user data root>/.group-director/muyu/workspace/
```

Searching or reading does not create this directory. Supported UTF-8 files are md/txt/json/js/mjs/cjs/css/html, up to 256 KiB each. Hidden files, `node_modules`, and sensitive names such as settings/secrets/credentials/config are excluded. Path traversal, symbolic links and junctions are rejected.

Tools can list directory contents, search for literal text and read versioned content in pages. Search returns at most 20 matches with snippets of up to 500 characters; a read page contains at most 8000 characters. Changes to file contents or root configuration invalidate old versions: obtain a fresh version before reading again. Restricted, skipped or empty results do not prove complete coverage.

Administrators can configure up to 8 additional read-only directories in the account-private `.group-director/muyu/document-roots.json`. Paths must be absolute:

```json
{"version":1,"roots":[{"id":"guides","title":"Personal guides","path":"E:\\MyDocs\\guides"}]}
```

There is no HTTP endpoint for adding document roots. Do not approve directories containing keys or other private data, and do not place private directories inside publicly served extension folders.

The model receives root IDs, titles, relative paths and versions—not absolute server disk paths. File contents remain untrusted reference data. Permission to read a script file is not permission to execute it.

### Workspace document drafts and JSON validation

The service creates or updates only flat md/txt/json files in the current account's private workspace. It does not write to additional administrator-approved document roots, scripts, Tavern configuration or secrets. Documents are not automatically applied as GroupDirector, GroupWorld or Tavern settings.

The model first prepares a draft containing the complete before-and-after text. Normal mode requires individual user confirmation; full-access mode still requires explicit execution intent. Read permission is not write approval, and installation alone grants neither.

- New content is limited to 64 KiB per file; the workspace allows up to 64 files and 8 MiB in total.
- Serialized preview text before and after a change is limited to 20000 UTF-8 bytes combined. The model tool additionally limits new text to 12000 characters.
- Updating a file requires its previous content version. Previews expire after 5 minutes, with at most 8 per account, and do not survive a service restart.
- Applying a preview checks its version and consumes it once. Original file bytes are backed up in the private `workspace-backups/` directory, retaining at most 20 backups; there is no automatic restore.
- Do not blindly retry after an unknown result or interrupted connection: inspect the actual file first. In-process serialization and version checks are not cross-process filesystem locks. Avoid editing the workspace simultaneously through an external editor or another service process.

JSON validation checks syntax, complexity, dangerous keys and non-finite numbers only. It does not validate GroupDirector, GroupWorld or Tavern business contracts, execute code or apply settings.

### Service checks and error records

**Check service capabilities** queries local service status only. It does not call a model or Brave and does not test your search key.

The storage self-check requires explicit confirmation. It creates a separate temporary directory under the account's private history directory, writes a probe, reads it back and cleans up. It does not modify real conversations. A successful check does not guarantee future writes, free disk space or persistence of actual conversations.

Error records cover only this service's history, search and storage-check failures—**not the complete SillyTavern CMD/console log**. Fields are restricted and sanitized; records do not contain content bodies, paths, queries, keys or exception stacks. They are held in memory, up to 200 per account and for at most 30 minutes. Capacity pressure may evict them earlier, and a restart clears them.

Users can view, export and explicitly clear these records in Muyu. Model reads still require the applicable data permissions; the model cannot clear them. An empty log does not prove that no problem occurred.

## Updating and troubleshooting

For a Git installation, run this from the Tavern root:

```sh
git -C plugins/gd-muyu-history pull --ff-only
```

For a ZIP installation, update all seven `.cjs` files and `package.json`, not just `index.cjs`. Restart Tavern after either update method. Update your chosen GroupDirector or GroupWorld client when new tools require it; switching clients does not require another service installation.

If Muyu reports that the service is unavailable, check:

1. It is installed under `plugins/` on the computer running Tavern, not under frontend `extensions/`.
2. The plugin directory directly contains all runtime files, without an extra nested folder.
3. `enableServerPlugins` is enabled and Tavern has been restarted since the change.
4. Service capabilities have been checked again in Muyu, and the switches for your desired tools are on.

After logging into Tavern, visit `/api/plugins/gd-muyu-history/health` to check whether the route loaded. This does not check disk access, model connections or Brave keys. The full capability declaration is returned by `/api/plugins/gd-muyu-history/service/status`.

## Development reference

All routes use the `/api/plugins/gd-muyu-history` prefix. Account identity is supplied by Tavern:

| Method | Path | Purpose |
|---|---|---|
| GET | `/health`, `/web/health` | Basic health checks |
| GET | `/service/status`, `/service/diagnostics` | Capabilities and sanitized error records |
| POST | `/service/storage-check`, `/service/diagnostics/clear` | Explicit storage check / clear records |
| GET | `/records`, `/records/:id` | History list and contents (UUID namespace) |
| PUT / DELETE | `/records/:id` | Revision-checked history update / deletion |
| POST | `/web/search`, `/web/page` | Search / public web-page text |
| POST | `/documents/roots`, `/documents/list`, `/documents/search`, `/documents/read` | Read-only document operations |
| POST | `/workspace/preview`, `/workspace/apply`, `/workspace/validate` | Draft / apply / JSON validation |

Run tests with:

```sh
npm test
```

Tests use Node's built-in test runner and isolated fixtures; no real model or Brave key is required. Shared runtime files stay synchronized with `muyu/server-plugin/` in GroupDirector and GroupWorld. This repository maintains its own installation documentation and tests. Display names may differ, but compatibility identifiers and protocols must not be renamed with the brand.

MIT License · Copyright (c) 2026 Windy-Sora.
