# ⚡ Ione — Code Toolbox

A fast, self-hosted developer toolbox that runs in your browser. Format, convert, validate, decode — plus a **Document → Markdown** converter powered by [Microsoft MarkItDown](https://github.com/microsoft/markitdown).

Almost everything runs **100% client-side** in vanilla JavaScript — no frameworks, no build step, no telemetry. The only server-side feature is the Markdown converter, which runs on a tiny Python stdlib server on `127.0.0.1`.

## 🚀 Quick Start

```bash
git clone git@github.com:gerardocipriano/ione.git ~/code/ione
~/code/ione/bin/ione-server.sh        # bootstraps venv + opens browser
```

On first run the launcher creates a `.venv` and installs `markitdown[all]` (takes a minute). After that, startup is instant.

### Shell alias

Add to your `~/.zshrc` / `~/.bashrc`:

```bash
alias ione='$HOME/code/ione/bin/ione-server.sh'
```

Then just type `ione` (optionally `ione 3000` for a custom port — default is `8080`).

## 🧰 Tools

| Category | Tools |
|---|---|
| 📝 **Markdown** | Document → Markdown converter (PDF, DOCX, XLSX, PPTX, HTML, CSV, EPUB, images, audio, ZIP) via MarkItDown |
| 🧮 **JSON** | Beautifier, Minifier, Sorter, Validator, JSON→XML, JSON→CSV |
| 💎 **SQL** | Beautifier, Minifier, Remove Comments |
| 🌐 **XML** | Beautifier, Minifier, Validator, XML→JSON |
| 🎨 **CSS** | Beautifier, Minifier, Validator |
| 🌍 **HTML** | Viewer, Beautifier, Minifier |
| 🔒 **Base64** | Encode, Decode, Image→Base64 |
| 🔑 **JWT** | Decoder |
| 📜 **Certificates** | Decoder, Validator, PEM↔DER, Merger, SHA-256 Fingerprint, CSR Decoder |
| ✏️ **Text Utilities** | 40+ tools: case converter, encoders (Base32/58, URL, HTML, hex, binary), line tools, password generator, ROT13, and more |
| 🖼️ **Images** | Multi-Screen Combiner |

## 📝 Document → Markdown

Upload any document via drag & drop and get clean Markdown back — copy it or download it as `.md`.

- **Endpoint**: `POST /api/markitdown` (multipart `file` field, or raw body + `X-Filename` header)
- **Response**: `{ "markdown": "...", "filename": "..." }` — errors come back as `{ "error": "..." }`
- **Limit**: 50 MB per file
- Files are written to a temp file, converted, and deleted immediately. Nothing is stored.

```bash
# Use it from the CLI too:
curl -F "file=@report.docx" http://localhost:8080/api/markitdown | jq -r .markdown
```

## 🏗️ Architecture

```
ione/
├── index.html            # SPA shell (hash routing)
├── css/style.css         # single stylesheet
├── js/
│   ├── app.js            # router, tool registry, rendering, JSON/SQL/XML/CSS/HTML engines
│   ├── textEngine.js     # text utilities
│   ├── imageEngine.js    # image combiner
│   ├── certificateEngine.js
│   └── markdownEngine.js # Document→Markdown UI (talks to /api/markitdown)
├── bin/
│   ├── ione-server.sh    # launcher: venv bootstrap + server + browser
│   ├── ione_server.py    # stdlib HTTP server: static files + /api/markitdown
│   └── alias-instruction.txt
└── <route dirs>/         # static fallback pages (json/, sql/, xml/, ...)
```

- **Zero JS dependencies** — everything is hand-rolled vanilla JS.
- **One Python dependency** — `markitdown[all]`, isolated in `.venv` (git-ignored).
- The server binds to **127.0.0.1 only**: nothing is exposed to your network.

## 🔧 Requirements

- Python 3.10+
- A browser
- `xdg-open` (Linux) for auto-opening — otherwise just visit `http://localhost:8080`

## 📄 License

Personal project — use freely.
