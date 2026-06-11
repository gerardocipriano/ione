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
| 📄 **PDF** | Merge, Split, Extract pages, Remove pages, Rotate, Compress, Sign (graphic signature) via pypdf + pdfcpu |
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

## 📄 PDF Tools

Seven operations under `POST /api/pdf/<op>` (multipart; success → binary PDF/zip download, failure → JSON `{ "error": "..." }`):

| Endpoint | Fields | Engine |
|---|---|---|
| `/api/pdf/merge` | `file` (repeated, ≥2) | pypdf |
| `/api/pdf/split` | `file` → zip of single-page PDFs | pypdf |
| `/api/pdf/extract` | `file`, `pages` (`1,3,5-9`) | pypdf |
| `/api/pdf/delete` | `file`, `pages` | pypdf |
| `/api/pdf/rotate` | `file`, `angle` (90/180/270), `pages` (optional) | pypdf |
| `/api/pdf/compress` | `file` | pdfcpu `optimize` |
| `/api/pdf/sign` | `file`, `signature` (PNG/JPG/WebP), `page`, `position` (9 anchors), `scale` | pdfcpu `stamp` |

```bash
curl -F "file=@a.pdf" -F "file=@b.pdf" http://localhost:8080/api/pdf/merge -o merged.pdf
curl -F "file=@doc.pdf" -F "signature=@sig.png" -F position=br -F scale=0.2 http://localhost:8080/api/pdf/sign -o signed.pdf
```

The launcher auto-downloads the **pdfcpu** single binary (~8 MB, Apache-2.0) into `.venv/bin` on first run — no Java, no Docker, no system packages.

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
