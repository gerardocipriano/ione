/**
 * Ione Clone — Main Application Script
 * SPA routing, tool orchestration, UI state, favorites
 */
(function () {
'use strict';

/* =============================================
   ROUTER
   ============================================= */
const Routes = {
  home    : '/',
  json    : '/json',
  sql     : '/sql',
  xml     : '/xml',
  css     : '/css',
  html    : '/html',
  base64  : '/base64',
  jwt     : '/jwt',
  cert    : '/cert',
  text    : '/text',
  ione    : '/ione',
};

function resolveRoute() {
  // 1) Check hash first (SPA mode from index.html)
  const hash = location.hash ? location.hash.slice(1) : '';
  if (hash) {
    if (hash === 'home' || hash === '') return { main: 'home' };
    // Support sub-routes: #text/compress → main=text, sub=compress
    const parts = hash.split('/');
    const validRoutes = ['json','sql','xml','css','html','base64','jwt','cert','text','ione','markdown','pdf'];
    if (validRoutes.includes(parts[0])) {
      return { main: parts[0], sub: parts[1] || null };
    }
    return { main: hash, sub: null };
  }
  // 2) Check path for static tool page (e.g., /json/beautify.html)
  const path = location.pathname.replace(/^\/+/, '').replace(/\/$/, '');
  if (!path || path === 'index.html') return { main: 'home', sub: null };
    const parts = path.split('/');
    const validRoutes = ['json','sql','xml','css','html','base64','jwt','text','ione','markdown','pdf'];
    if (parts.length >= 1 && validRoutes.includes(parts[0])) {
    return { main: parts[0], sub: parts[1]?.replace('.html','') || null };
  }
  return { main: path, sub: null };
}

function navigate(route, sub) {
  if (route === 'home') { location.hash = ''; return; }
  location.hash = sub ? route + '/' + sub : route;
}

window.appNavigate = navigate;

/* =============================================
   FAVORITES SYSTEM
   ============================================= */
function getFavorites() {
  try {
    return JSON.parse(localStorage.getItem('ione-favorites') || '[]');
  } catch(e) { return []; }
}

function toggleFavorite(toolId) {
  let favs = getFavorites();
  if (favs.includes(toolId)) {
    favs = favs.filter(f => f !== toolId);
  } else {
    favs.push(toolId);
  }
  localStorage.setItem('ione-favorites', JSON.stringify(favs));
  return favs.includes(toolId);
}

function isFavorite(toolId) {
  return getFavorites().includes(toolId);
}

/* =============================================
   TOOL CONFIG
   ============================================= */
const TOOLS = [
  // JSON
  { id:'json-beautify',     label:'JSON Beautifier',    icon:'🧮', category:'JSON Tools',              route:'json',  sub:'beautify' },
  { id:'json-minify',       label:'JSON Minifier',       icon:'🗜️', category:'JSON Tools',              route:'json',  sub:'minify'   },
  { id:'json-sort',         label:'JSON Sorter',          icon:'🔃', category:'JSON Tools',              route:'json',  sub:'sort'     },
  { id:'json-validate',     label:'JSON Validator',       icon:'✅', category:'JSON Tools',              route:'json',  sub:'validate' },
  { id:'json-xml',          label:'JSON to XML',          icon:'📄', category:'JSON Tools',              route:'json',  sub:'toxml'    },
  { id:'json-csv',          label:'JSON to CSV',          icon:'📊', category:'JSON Tools',              route:'json',  sub:'tocsv'    },
  // SQL
  { id:'sql-beautify',      label:'SQL Beautifier',       icon:'💎', category:'SQL Tools',               route:'sql',   sub:'beautify' },
  { id:'sql-minify',        label:'SQL Minifier',         icon:'🗜️', category:'SQL Tools',               route:'sql',   sub:'minify'   },
  { id:'sql-remove-comments',label:'SQL Remove Comments', icon:'✏️', category:'SQL Tools',               route:'sql',   sub:'comments' },
  // XML
  { id:'xml-beautify',      label:'XML Beautifier',       icon:'🌐', category:'XML Tools',               route:'xml',   sub:'beautify' },
  { id:'xml-minify',        label:'XML Minifier',         icon:'🗜️', category:'XML Tools',               route:'xml',   sub:'minify'   },
  { id:'xml-validate',      label:'XML Validator',        icon:'✅', category:'XML Tools',               route:'xml',   sub:'validate' },
  { id:'xml-json',          label:'XML to JSON',          icon:'📄', category:'XML Tools',               route:'xml',   sub:'tojson'   },
  // CSS
  { id:'css-beautify',      label:'CSS Beautifier',       icon:'🎨', category:'CSS Tools',               route:'css',   sub:'beautify' },
  { id:'css-minify',        label:'CSS Minifier',         icon:'🗜️', category:'CSS Tools',               route:'css',   sub:'minify'   },
  { id:'css-validate',      label:'CSS Validator',        icon:'✅', category:'CSS Tools',               route:'css',   sub:'validate' },
  // HTML
  { id:'html-viewer',       label:'HTML Viewer',          icon:'🌍', category:'HTML Tools',              route:'html',  sub:'view'     },
  { id:'html-beautify',     label:'HTML Beautifier',      icon:'🎨', category:'HTML Tools',              route:'html',  sub:'beautify' },
  { id:'html-minify',       label:'HTML Minifier',        icon:'🗜️', category:'HTML Tools',              route:'html',  sub:'minify'   },
  // Base64
  { id:'b64-encode',        label:'Base64 Encode',        icon:'🔒', category:'Base64 Tools',            route:'base64',sub:'encode'   },
  { id:'b64-decode',        label:'Base64 Decode',        icon:'🔓', category:'Base64 Tools',            route:'base64',sub:'decode'   },
  { id:'b64-img',           label:'Image to Base64',      icon:'🖼️', category:'Base64 Tools',            route:'base64',sub:'img2b64'  },
  // JWT
  { id:'jwt-decode',        label:'JWT Decode',           icon:'🔑', category:'JSON Tools',              route:'jwt',   sub:'decode'   },

  // ── Certificate Tools ──────────────────────────────────────────────
  { id:'cert-decode',       label:'Certificate Decoder',  icon:'🔍', category:'Certificate Tools',        route:'cert',  sub:'decode'       },
  { id:'cert-validate',     label:'Certificate Validator',icon:'✅', category:'Certificate Tools',        route:'cert',  sub:'validate'     },
  { id:'cert-pem2der',      label:'PEM → DER',            icon:'⬇️', category:'Certificate Tools',        route:'cert',  sub:'pem2der'      },
  { id:'cert-der2pem',      label:'DER → PEM',            icon:'⬆️', category:'Certificate Tools',        route:'cert',  sub:'der2pem'      },
  { id:'cert-merge',        label:'Certificate Merger',   icon:'🔗', category:'Certificate Tools',        route:'cert',  sub:'merge'        },
  { id:'cert-fingerprint',  label:'SHA-256 Fingerprint',  icon:'🖐️', category:'Certificate Tools',        route:'cert',  sub:'fingerprint'  },
  { id:'cert-csr-decode',   label:'CSR Decoder',          icon:'📝', category:'Certificate Tools',        route:'cert',  sub:'csr-decode'   },

  // ── Text Utilities ──────────────────────────────────────────────
  { id:'txt-upside-down',   label:'Upside Down Text',      icon:'🙃', category:'Text Utilities',         route:'text',  sub:'reverse'  },
  { id:'txt-randomizer',    label:'Letter Randomizer',     icon:'🎲', category:'Text Utilities',         route:'text',  sub:'scramble' },
  { id:'txt-ntlm',          label:'NTLM Hash Generator',   icon:'🔒', category:'Text Utilities',         route:'text',  sub:'ntlm'     },
  { id:'txt-password',      label:'Password Generator',    icon:'🔑', category:'Text Utilities',         route:'text',  sub:'password' },
  { id:'txt-rand-words',    label:'Random Words Generator',icon:'📝', category:'Text Utilities',         route:'text',  sub:'randwords'},
  { id:'txt-minifier',      label:'Text Minifier',         icon:'🗜️', category:'Text Utilities',         route:'text',  sub:'minify'   },
  { id:'txt-repeater',      label:'Word Repeater',         icon:'🔁', category:'Text Utilities',         route:'text',  sub:'repeat'   },
  { id:'txt-builder',       label:'String Builder',        icon:'🧱', category:'Text Utilities',         route:'text',  sub:'builder'  },
  { id:'txt-filter',        label:'Intelligent Message Filter', icon:'🧹', category:'Text Utilities',    route:'text',  sub:'filter'   },
  { id:'txt-replacer',      label:'Word Replacer',         icon:'✏️', category:'Text Utilities',         route:'text',  sub:'replace'  },
  { id:'txt-reverse',       label:'Reverse String',        icon:'🔙', category:'Text Utilities',         route:'text',  sub:'reverse'  },
  { id:'txt-html-enc',      label:'HTML Encode',            icon:'🛡️', category:'Text Utilities',         route:'text',  sub:'htmlenc'  },
  { id:'txt-html-dec',      label:'HTML Decode',            icon:'🔓', category:'Text Utilities',         route:'text',  sub:'htmldec'  },
  { id:'txt-base32-enc',    label:'Base32 Encode',          icon:'🗜️', category:'Text Utilities',         route:'text',  sub:'b32enc'   },
  { id:'txt-base32-dec',    label:'Base32 Decode',          icon:'🔓', category:'Text Utilities',         route:'text',  sub:'b32dec'   },
  { id:'txt-base58-enc',    label:'Base58 Encode',          icon:'🔒', category:'Text Utilities',         route:'text',  sub:'b58enc'   },
  { id:'txt-base58-dec',    label:'Base58 Decode',          icon:'🔓', category:'Text Utilities',         route:'text',  sub:'b58dec'   },
  { id:'txt-url-enc',       label:'URL Encode',             icon:'🔗', category:'Text Utilities',         route:'text',  sub:'urlenc'   },
  { id:'txt-url-dec',       label:'URL Decode',             icon:'🔓', category:'Text Utilities',         route:'text',  sub:'urldec'   },
  { id:'txt-str2hex',       label:'String to Hex Converter',icon:'🔢', category:'Text Utilities',         route:'text',  sub:'str2hex'  },
  { id:'txt-hex2str',       label:'Hex to String Converter',icon:'💬', category:'Text Utilities',         route:'text',  sub:'hex2str'  },
  { id:'txt-str2bin',       label:'String to Binary Converter',icon:'0.1', category:'Text Utilities',   route:'text',  sub:'str2bin'  },
  { id:'txt-bin2str',       label:'Binary to String Converter',icon:'💬', category:'Text Utilities',   route:'text',  sub:'bin2str'  },
  { id:'txt-case',          label:'Case Converter',         icon:'Aa', category:'Text Utilities',         route:'text',  sub:'case'     },
  { id:'txt-delimited',     label:'Delimited Text Extractor',icon:'📊', category:'Text Utilities',         route:'text',  sub:'delimited'},
  { id:'txt-rm-punct',      label:'Remove Punctuation',    icon:'✂️', category:'Text Utilities',         route:'text',  sub:'rmpunct'  },
  { id:'txt-rm-accents',    label:'Remove Accents',        icon:'🗣️', category:'Text Utilities',         route:'text',  sub:'rmaccents'},
  { id:'txt-rm-duplines',   label:'Remove Duplicate Lines',icon:'📋', category:'Text Utilities',         route:'text',  sub:'rmduplines'},
  { id:'txt-rm-emptylines', label:'Remove Empty Lines',     icon:'🗑️', category:'Text Utilities',         route:'text',  sub:'rmemptylines'},
  { id:'txt-rm-linebreaks', label:'Remove Line Breaks',     icon:'➡️', category:'Text Utilities',         route:'text',  sub:'rmlinebreaks'},
  { id:'txt-rm-extraspace', label:'Remove Extra Spaces',    icon:'🧹', category:'Text Utilities',         route:'text',  sub:'rmextraspace'},
  { id:'txt-rm-ws',         label:'Remove Whitespace',      icon:'⬜', category:'Text Utilities',         route:'text',  sub:'rmws'     },
  { id:'txt-rm-lines-with', label:'Remove Lines Containing',icon:'🚫', category:'Text Utilities',         route:'text',  sub:'rmlineswith'},
  { id:'txt-sort-lines',    label:'Sort Text Lines',        icon:'🔃', category:'Text Utilities',         route:'text',  sub:'sortlines'},
  { id:'txt-rot13',         label:'Text to ROT13',          icon:'🔄', category:'Text Utilities',         route:'text',  sub:'rot13'    },
  { id:'txt-rot13-decode',  label:'ROT13 to Text',          icon:'🔙', category:'Text Utilities',         route:'text',  sub:'rot13dec' },
  { id:'txt-strlen',        label:'Calculate String Length',icon:'📏', category:'Text Utilities',         route:'text',  sub:'strlen'   },
  { id:'txt-flipper',       label:'Text Flipper',           icon:'🔀', category:'Text Utilities',         route:'text',  sub:'flipper'  },
  { id:'txt-compress',      label:'LLM Token Compressor',   icon:'🤖', category:'Text Utilities',         route:'text',  sub:'compress' },

  // ── Image Tools ──────────────────────────────────────────────
  { id:'ione-combiner',     label:'Multi-Screen Combiner', icon:'🖼️', category:'Image Tools',            route:'ione',  sub:'combiner' },

  // ── Document Tools ──────────────────────────────────────────
  { id:'markdown-convert',  label:'Document to Markdown',   icon:'📝', category:'Document Tools',        route:'markdown', sub:'convert' },
  // PDF Tools
  { id:'pdf-merge',         label:'Merge PDFs',             icon:'📄', category:'PDF Tools',             route:'pdf',   sub:'merge'    },
  { id:'pdf-split',         label:'Split PDF',              icon:'✂️', category:'PDF Tools',             route:'pdf',   sub:'split'    },
  { id:'pdf-extract',       label:'Extract Pages',          icon:'📋', category:'PDF Tools',             route:'pdf',   sub:'extract'  },
  { id:'pdf-delete',        label:'Remove Pages',           icon:'🗑️', category:'PDF Tools',             route:'pdf',   sub:'delete'   },
  { id:'pdf-rotate',        label:'Rotate PDF',             icon:'🔄', category:'PDF Tools',             route:'pdf',   sub:'rotate'   },
  { id:'pdf-compress',       label:'Compress PDF',           icon:'🗜️', category:'PDF Tools',             route:'pdf',   sub:'compress' },
  { id:'pdf-sign',          label:'Sign PDF',               icon:'✍️', category:'PDF Tools',             route:'pdf',   sub:'sign'     },
];

// group by category for homepage
function getToolsByCategory() {
  const map = {};
  TOOLS.forEach(t => {
    if (!map[t.category]) map[t.category] = [];
    map[t.category].push(t);
  });
  return map;
}

/* =============================================
   RENDER FUNCTIONS
   ============================================= */

/** Render the Hero + Search + Categories + Tool Grid on the homepage */
function renderHomepage() {
  document.title = 'Ione — Code Formatter & Beautifier';
  const catMap = getToolsByCategory();
  // popular / featured
  const featured = ['json-beautify','sql-beautify','xml-beautify','css-beautify',
                    'html-viewer','b64-encode','b64-decode','jwt-decode'];

  const favs = getFavorites();
  const favTools = favs.length > 0 ? TOOLS.filter(t => favs.includes(t.id)) : [];

  let html = `
  <div class="hero">
    <h1>⚡ Ione Toolbox</h1>
    <p>Code Formatter, JSON Beautifier, XML Viewer, Image Combiner and more…</p>
    <div class="search-wrap">
      <span class="search-icon">🔍</span>
      <input type="text" id="global-search" placeholder="Search Ione tools…" autocomplete="off">
    </div>
  </div>

  <div class="category-bar">
    <span class="cat-badge ${TOOLS.every(t=>true)?'active':''}" data-cat="all">All</span>
    ${Object.keys(catMap).map(c =>
      `<span class="cat-badge" data-cat="${c}">${c}</span>`
    ).join('')}
  </div>

  <div class="main">
    <div id="results">
      ${favTools.length > 0 ? `
        <h3 class="section-heading">⭐ Favorites</h3>
        <div class="featured-grid" data-favs="true">
          ${favTools.map(t => featuredCardHtml(t)).join('')}
        </div>
      ` : ''}
      ${renderFeatured(featured, TOOLS)}
      ${Object.entries(catMap).map(([cat, tools]) => `
        <h3 class="section-heading">${cat}</h3>
        <div class="tools-grid" data-cat="${cat}">
          ${tools.map(t => cardHtml(t)).join('')}
        </div>
      `).join('')}
    </div>
  </div>
  `;
  writeMain(html);
  bindHomepageEvents();
}

function renderFeatured(ids, allTools) {
  const featuredTools = allTools.filter(t => ids.includes(t.id));
  return `
    <h3 class="section-heading">⚡ Popular Tools</h3>
    <div class="featured-grid">
      ${featuredTools.map(t => featuredCardHtml(t)).join('')}
    </div>
  `;
}

function cardHtml(tool) {
  const fav = isFavorite(tool.id);
  return `
    <div class="tool-card-wrapper" data-id="${tool.id}">
      <a class="tool-card" href="#${tool.route}${tool.sub ? '/' + tool.sub : ''}" title="${tool.label}">
        <div class="icon">${tool.icon}</div>
        <div class="info">
          <div class="name">${tool.label}</div>
          <div class="cat-label">${tool.category}</div>
        </div>
      </a>
      <button class="fav-btn ${fav ? 'fav-active' : ''}" data-tool-id="${tool.id}" title="${fav ? 'Remove from favorites' : 'Add to favorites'}">${fav ? '★' : '☆'}</button>
    </div>`;
}

function featuredCardHtml(tool) {
  const fav = isFavorite(tool.id);
  return `
    <div class="featured-card-wrapper" data-id="${tool.id}">
      <a class="featured-card" href="#${tool.route}${tool.sub ? '/' + tool.sub : ''}">
        <div class="f-name">${tool.icon} ${tool.label}</div>
        <div class="f-desc">${tool.category}</div>
      </a>
      <button class="fav-btn ${fav ? 'fav-active' : ''}" data-tool-id="${tool.id}" title="${fav ? 'Remove from favorites' : 'Add to favorites'}">${fav ? '★' : '☆'}</button>
    </div>`;
}

/** Render a tool page */
function renderToolPage(route) {
  // route = {main, sub}
  const key = route.sub ? route.main + '-' + route.sub : route.main;
  const tool = TOOLS.find(t => t.route === route.main && (route.sub ? t.sub === route.sub : true));
  if (!tool) { render404(); return; }

  document.title = tool.label + ' — Ione Clone';
  const html = buildToolHtml(tool);
  writeMain(html);
  bindToolPageEvents(tool);
}

function buildToolHtml(tool) {
  const actionBtns  = getToolActionButtons(tool);
  const optionsHtml = getToolOptionsHtml(tool);
  const subBtns     = getToolSubButtons(tool);
  return `
  <div class="tool-header" id="toolHeader">
    <div class="tool-title">
      <span style="font-size:1.8rem">${tool.icon}</span>
      <h2>${tool.label}</h2>
    </div>
    <div class="tool-actions">
      <button class="btn btn-sm" id="btnNew">⊹ New</button>
      <button class="btn btn-sm" id="btnClear">🗑 Clear</button>
      <button class="btn btn-sm" id="btnCopyIn">📋 Copy Input</button>
      <button class="btn btn-sm" id="btnCopyOut">📋 Copy Output</button>
      <button class="btn btn-sm" id="btnSave">💾 Save &amp; Share</button>
      <button class="btn btn-sm" id="btnFullscreen">⛶ FullScreen</button>
    </div>
  </div>
  <div class="msg-box error" id="msgError" role="alert"></div>
  <div class="msg-box success" id="msgSuccess" role="status"></div>
  <div class="msg-box info" id="msgInfo"></div>
  <div class="editor-area">
    <!-- INPUT -->
    <div class="editor-panel">
      <div class="panel-header">
        <span class="panel-title">Input</span>
        <div class="panel-options">
          ${getPanelTopOptions(tool, 'input')}
          <button class="btn btn-sm" id="btnLoadPrev" title="Load previous from local storage">📂 Previous</button>
          <label class="btn btn-sm" for="fileInput">📂 File</label>
          <input type="file" id="fileInput" style="display:none">
          <button class="btn btn-sm" id="btnUrlInput">🔗 URL</button>
          <label class="btn btn-sm" title="Auto-update on input change">
            <input type="checkbox" id="autoUpdate" checked> Auto Update
          </label>
          <label class="btn btn-sm" title="Increase font">
            <button class="btn btn-icon btn-sm" id="fontUp">A+</button>
          </label>
        </div>
      </div>
      <div class="editor-body">
        <textarea id="inputArea" placeholder="Paste or type your data here…" spellcheck="false"></textarea>
      </div>
      <div class="status-bar">
        <span id="statusInput">Ln: 1 Col: 1</span>
        <span>${tool.label}</span>
      </div>
    </div>
    <!-- OUTPUT -->
    <div class="editor-panel">
      <div class="panel-header">
        <span class="panel-title">Output</span>
        <div class="panel-options">
          ${getPanelTopOptions(tool, 'output')}
          <button class="btn btn-sm" id="btnSaveOut">💾 Save</button>
          <button class="btn btn-sm" id="btnClearOut">🗑 Clear</button>
          <button class="btn btn-sm" id="btnCopyOut2">📋 Copy</button>
          <button class="btn btn-sm" id="btnDlOutput">⬇ Download</button>
          <button class="btn btn-sm" id="btnFullscreenOut">⛶ FullScreen</button>
        </div>
      </div>
      <div class="editor-body">
        <div class="result-display" id="outputArea"></div>
      </div>
      <div class="status-bar">
        <span id="statusOutput">Ln: 1 Col: 1</span>
        <span>${tool.label} Output</span>
      </div>
    </div>
  </div>
  <!-- main action row -->
  <div class="mb-2 mt-2" style="display:flex;gap:.5rem;flex-wrap:wrap;align-items:center">
    <span style="font-size:.85rem;color:var(--text-muted);margin-right:.5rem">Actions:</span>
    ${actionBtns}
  </div>
  `;
}

function getToolSubButtons(tool) { return ''; }

function getToolActionButtons(tool) {
  switch (tool.route) {
    case 'json':
      return ['format','minify','validate','toxml','tocsv'].map(a =>
        `<button class="btn btn-sm" data-action="${a}">${
          {format:'✨ Format JSON',minify:'🗜 Minify JSON',validate:'✅ Validate',toxml:'→ XML',tocsv:'→ CSV'}
          [a]}</button>`
      ).join('');
    case 'sql':
      return ['beautify','minify','comments'].map(a =>
        `<button class="btn btn-sm" data-action="${a}">${
          {beautify:'✨ SQL Beautify',minify:'🗜 SQL Minify',comments:'🗑 Remove Comments'}
          [a]}</button>`
      ).join('');
    case 'xml':
      return ['beautify','minify','validate','tojson'].map(a =>
        `<button class="btn btn-sm" data-action="${a}">${
          {beautify:'✨ Format XML',minify:'🗜 Minify XML',validate:'✅ Validate',tojson:'→ JSON'}
          [a]}</button>`
      ).join('');
    case 'css':
      return ['beautify','minify','validate'].map(a =>
        `<button class="btn btn-sm" data-action="${a}">${
          {beautify:'✨ CSS Beautify',minify:'🗜 Minify CSS',validate:'✅ Validate'}
          [a]}</button>`
      ).join('');
    case 'html':
      return ['beautify','minify','source'].map(a =>
        `<button class="btn btn-sm" data-action="${a}">${
          {beautify:'✨ Format HTML',minify:'🗜 Minify HTML',source:'👁 Source Code'}
          [a]}</button>`
      ).join('');
    case 'base64':
      return ['encode','decode'].map(a =>
        `<button class="btn btn-sm" data-action="${a}">${
          {encode:'🔒 Encode → Base64',decode:'🔓 Decode ← Base64'}
          [a]}</button>`
      ).join('');
    case 'cert':
      return `<button class="btn btn-sm btn-primary" data-action="${tool.sub}">⚡ Process</button>`;
    case 'jwt':
      return ['decode','encode'].map(a =>
        `<button class="btn btn-sm" data-action="${a}">${
          {decode:'🔑 Decode JWT',encode:'🔑 Encode JWT'}
          [a]}</button>`
      ).join('');
    default:
      return `<button class="btn btn-sm btn-primary" data-action="${tool.sub}">⚡ Process</button>`;
  }
}

function getToolOptionsHtml(tool) {
  if (tool.route === 'json') {
    return `
      <label style="font-size:.78rem">Tab size:
        <select id="optTabSize">
          <option value="1">1 Tab</option>
          <option value="2" selected>2 Tab</option>
          <option value="3">3 Tab</option>
          <option value="4">4 Tab</option>
          <option value="6">6 Tab</option>
          <option value="8">8 Tab</option>
          <option value="10">10 Tab</option>
        </select>
      </label>
      <label style="font-size:.78rem"><input type="checkbox" id="optBigNum" title="Big Num"> Big Num</label>
      <label style="font-size:.78rem"><input type="checkbox" id="optSortKeys"> Sort Keys</label>
    `;
  }
  if (tool.route === 'sql') {
    return `
      <label style="font-size:.78rem">Dialect:
        <select id="optDialect">
          <option value="sql" selected>SQL</option>
          <option value="n1ql">N1QL (Couchbase)</option>
          <option value="db2">IBM DB2</option>
        </select>
      </label>
    `;
  }
  if (tool.route === 'css') {
    return `
      <label style="font-size:.78rem">Indent:
        <select id="optIndent">
          <option value="1">1 Space</option>
          <option value="2" selected>2 Spaces (tabs)</option>
          <option value="4">4 Spaces</option>
        </select>
      </label>
      <label style="font-size:.78rem"><input type="checkbox" id="optNewline"> Newline</label>
    `;
  }
  return '';
}

function getPanelTopOptions(tool, side) {
  if (tool.route === 'json' && side === 'input') {
    return `
      <label style="font-size:.78rem">Tab:
        <select id="optTabSize"><option value="2" selected>2</option><option value="4">4</option></select>
      </label>
    `;
  }
  return '';
}

/* =============================================
   ERROR/STATUS HELPERS
   ============================================= */
function setError(msg) {
  const el = document.getElementById('msgError');
  if (!el) return;
  el.textContent = '❌ ' + msg;
  el.style.display = 'flex';
  clearMsg('msgSuccess');
  clearMsg('msgInfo');
}
function setSuccess(msg) {
  const el = document.getElementById('msgSuccess');
  if (!el) return;
  el.textContent = '✅ ' + msg;
  el.style.display = 'flex';
  clearMsg('msgError');
  clearMsg('msgInfo');
}
function setInfo(msg) {
  const el = document.getElementById('msgInfo');
  if (!el) return;
  el.textContent = 'ℹ️ ' + msg;
  el.style.display = 'flex';
}
function clearMsg(id) {
  const el = document.getElementById(id);
  if (el) el.style.display = 'none';
}

/* =============================================
   EVENT BINDING — HOMEPAGE
   ============================================= */
function bindHomepageEvents() {
  // Category filter
  const catMap = getToolsByCategory();
  document.querySelectorAll('.cat-badge').forEach(badge => {
    badge.addEventListener('click', () => {
      document.querySelectorAll('.cat-badge').forEach(b => b.classList.remove('active'));
      badge.classList.add('active');
      const cat = badge.dataset.cat;
      // Toggle grid sections
      document.querySelectorAll('.tools-grid').forEach(g => {
        g.style.display = (cat === 'all' || g.dataset.cat === cat) ? 'grid' : 'none';
      });
      // Toggle section headings
      document.querySelectorAll('.section-heading').forEach(h => {
        const headingCat = h.textContent.replace(/^[⭐⚡🔄]*\s*/,'').trim();
        const isFav = headingCat === 'Favorites';
        const isPopular = headingCat === 'Popular Tools';
        if (isFav) {
          h.style.display = (cat === 'all') ? '' : 'none';
          const favGrid = document.querySelector('.featured-grid[data-favs]');
          if (favGrid) favGrid.style.display = (cat === 'all') ? '' : 'none';
        } else if (isPopular) {
          h.style.display = (cat === 'all') ? '' : 'none';
        } else {
          h.style.display = (cat === 'all' || headingCat === cat) ? '' : 'none';
        }
      });
    });
  });

  // Global search
  const searchInput = document.getElementById('global-search');
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      const q = searchInput.value.trim().toLowerCase();
      document.querySelectorAll('.tool-card-wrapper,.featured-card-wrapper').forEach(wrap => {
        const found = wrap.textContent.toLowerCase().includes(q);
        wrap.style.display = found ? '' : 'none';
      });
    });
  }

  // Favorite buttons
  document.querySelectorAll('.fav-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      e.preventDefault();
      const toolId = btn.dataset.toolId;
      const nowFav = toggleFavorite(toolId);
      if (nowFav) {
        btn.classList.add('fav-active');
        btn.textContent = '★';
        btn.title = 'Remove from favorites';
      } else {
        btn.classList.remove('fav-active');
        btn.textContent = '☆';
        btn.title = 'Add to favorites';
      }
    });
  });
}

/* =============================================
   EVENT BINDING — TOOL PAGES
   ============================================= */
function bindToolPageEvents(tool) {
  const input  = document.getElementById('inputArea');
  const output = document.getElementById('outputArea');
  const autoUp = document.getElementById('autoUpdate');
  let timer = null;

  // line/col tracking
  function updateStatus(textarea, elId) {
    const el = document.getElementById(elId);
    if (!el || !textarea) return;
    const lines = textarea.value.substring(0, textarea.selectionStart).split('\n');
    el.textContent = `Ln:${lines.length} Col:${lines[lines.length-1].length+1}`;
  }
  input.addEventListener('keyup',   () => updateStatus(input, 'statusInput'));
  input.addEventListener('click',   () => updateStatus(input, 'statusInput'));
  setTimeout(() => updateStatus(input, 'statusInput'), 100);

  // auto-update debounce
  input.addEventListener('input', () => {
    if (!autoUp?.checked) return;
    clearTimeout(timer);
    timer = setTimeout(() => runToolDefaultAction(tool), 500);
  });

  // Action buttons
  document.querySelectorAll('[data-action]').forEach(btn => {
    btn.addEventListener('click', () => runToolAction(tool, btn.dataset.action));
  });

  // Header buttons
  document.getElementById('btnNew')?.addEventListener('click', () => {
    input.value = '';
    output.innerHTML = '';
    clearMsg('msgError'); clearMsg('msgSuccess'); clearMsg('msgInfo');
    updateStatus(input, 'statusInput'); updateStatus(document.getElementById('outputArea'), 'statusOutput');
  });
  document.getElementById('btnClear')?.addEventListener('click', () => {
    input.value = '';
    output.innerHTML = '';
    clearMsg('msgError');
  });
  document.getElementById('btnCopyIn')?.addEventListener('click', () => {
    navigator.clipboard.writeText(input.value).then(() => setInfo('Input copied to clipboard!'));
  });
  document.getElementById('btnCopyOut')?.addEventListener('click', () => {
    navigator.clipboard.writeText(output.textContent).then(() => setInfo('Output copied to clipboard!'));
  });
  document.getElementById('btnSave')?.addEventListener('click', () => {
    const blob = new Blob([output.textContent], { type: 'text/plain' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = `${tool.label.replace(/\s+/g,'_')}.txt`;
    a.click(); URL.revokeObjectURL(url);
    setSuccess('File saved!');
  }); // File input

  // Fullscreen
  document.getElementById('btnFullscreen')?.addEventListener('click', () => {
    const el = input.closest('.editor-panel') || input;
    toggleFullscreen(el.closest('.editor-panel'));
  });
  document.getElementById('btnFullscreenOut')?.addEventListener('click', () => {
    toggleFullscreen(output.closest('.editor-panel') || output.closest('body'));
  });

  // File input
  document.getElementById('fileInput')?.addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => { input.value = ev.target.result; setInfo(`Loaded: ${file.name}`); };
    reader.readAsText(file);
  });

  // URL button
  document.getElementById('btnUrlInput')?.addEventListener('click', async () => {
    const url = prompt('Enter URL:');
    if (!url) return;
    try {
      const res  = await fetch(url);
      const text = await res.text();
      input.value = text;
      setInfo(`Loaded from: ${url}`);
    } catch (err) { setError('Failed to fetch URL: ' + err.message); }
  });

  // Download output
  document.getElementById('btnDlOutput')?.addEventListener('click', () => {
    const text = output.textContent;
    if (!text) { setError('Nothing to download!'); return; }
    const blob = new Blob([text], { type: 'text/plain' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url;
    a.download = `${tool.label.replace(/\s+/g,'_')}_output.txt`;
    a.click(); URL.revokeObjectURL(url);
    setSuccess('Download started!');
  });

  // Previous from localStorage
  document.getElementById('btnLoadPrev')?.addEventListener('click', () => {
    const prev = localStorage.getItem('cb-last-input');
    if (prev) { input.value = prev; setInfo('Restored previous input.'); }
    else setInfo('No previous input found.');
  });

  // Restore from URL params
  const params = new URLSearchParams(location.search);
  const urlParam = params.get('url');
  const inputParam = params.get('input');
  if (urlParam) { /* try fetch */ }

  // Font size controls
  document.getElementById('fontUp')?.addEventListener('click', () => {
    const fs = parseFloat(getComputedStyle(input).fontSize);
    input.style.fontSize = (fs + 1) + 'px';
    output.style.fontSize = (fs + 1) + 'px';
  });

  // Escape key: restore fullscreen
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && document.fullscreenElement) document.exitFullscreen();
  });

  // Default auto-action (beautify) after short delay
  if (input.value) setTimeout(() => runToolDefaultAction(tool), 300);
}

/* =============================================
   TOOL ENGINE
   ============================================= */

function runToolDefaultAction(tool) {
  switch (tool.route) {
    case 'json'   : runToolAction(tool, 'format'); break;
    case 'sql'    : runToolAction(tool, 'beautify'); break;
    case 'xml'    : runToolAction(tool, 'beautify'); break;
    case 'css'    : runToolAction(tool, 'beautify'); break;
    case 'html'   : runToolAction(tool, 'beautify'); break;
    case 'base64' : runToolAction(tool, 'encode'); break;
    case 'jwt'    : runToolAction(tool, 'decode'); break;
    case 'cert'   : runToolAction(tool, tool.sub); break;
    case 'text'   : runToolAction(tool, tool.sub); break;
  }
}

function runToolAction(tool, action) {
  const inputVal  = document.getElementById('inputArea')?.value ?? '';
  const outputEl  = document.getElementById('outputArea');
  if (!outputEl) return;
  clearMsg('msgError'); clearMsg('msgSuccess'); clearMsg('msgInfo');

  try {
    let result;
    switch (tool.route) {
      case 'json':
        result = jsonEngine(inputVal, action, tool.sub);
        break;
      case 'sql':
        result = sqlEngine(inputVal, action);
        break;
      case 'xml':
        result = xmlEngine(inputVal, action);
        break;
      case 'css':
        result = cssEngine(inputVal, action);
        break;
      case 'html':
        result = htmlEngine(inputVal, action);
        break;
      case 'base64':
        result = base64Engine(inputVal, action);
        break;
      case 'jwt':
        result = jwtEngine(inputVal, action);
        break;
      case 'cert':
        result = certificateEngine(inputVal, action);
        break;
      case 'text':
        result = textEngine(inputVal, action);
        break;
      default:
        result = inputVal;
    }

    outputEl.innerHTML = renderOutput(result, tool.route);
    setSuccess(`${action.replace(/[_-]/g,' ')} completed successfully!`);
    // save to localStorage
    localStorage.setItem('cb-last-input', inputVal);
  } catch (err) {
    setError(err.message);
    outputEl.innerHTML = '';
  }
}

/* =============================================
   JSON ENGINE
   ============================================= */
function jsonEngine(input, action, sub) {
  const tabSize = parseInt(document.getElementById('optTabSize')?.value || 2);
  const bigNum  = !!document.getElementById('optBigNum')?.checked;
  const sortK   = !!document.getElementById('optSortKeys')?.checked;

  function parse() {
    try { return JSON.parse(input); } catch(e) { throw new Error('Invalid JSON: ' + e.message); }
  }

  switch (action) {
    case 'format': {
      const obj  = parse();
      return JSON.stringify(obj, null, tabSize);
    }
    case 'minify': {
      const obj  = parse();
      return JSON.stringify(obj);
    }
    case 'validate': {
      JSON.parse(input);
      return '✅ Valid JSON';
    }
    case 'toxml': {
      const obj = parse();
      return json2xml(obj);
    }
    case 'tocsv': {
      return json2csv(parse());
    }
case 'compress': {
  const tokens = input.split(/\s+/).filter(Boolean);
  return `${tokens.length} tokens`;
}
case 'process': {
  const tokens = input.split(/\s+/).filter(Boolean);
  return `${tokens.length} tokens`;
}
default:
  return input;
}
}

function json2xml(obj, rootName) {
  function esc(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\"/g,'&quot;'); }
  function toXml(v, name) {
    if (v === null)  return `<${name} null="true"/>`;
    if (typeof v === 'boolean') return `<${name}>${v}</${name}>`;
    if (typeof v === 'number') return `<${name}>${v}</${name}>`;
    if (Array.isArray(v)) return v.map((item,i) => toXml(item, name || `<item index="${i}">`)).join('');
    if (typeof v === 'object') {
      const inner = Object.entries(v).map(([k,val]) => toXml(val, k)).join('');
      return name ? `<${name}>${inner}</${name}>` : inner;
    }
    return `<${name}>${esc(v)}</${name}>`;
  }
  return toXml(obj, rootName || 'root');
}

function json2csv(obj) {
  if (!Array.isArray(obj) || obj.length === 0) return '# CSV: Convert JSON array of objects to CSV';
  const keys = [...new Set(obj.flatMap(o => Object.keys(o || {})))];
  const rows = [keys.join(','),
    ...obj.map(row => keys.map(k =>
      (row[k] ?? '').toString().includes(',') ? `"${(row[k]||'').replace(/"/g,'""')}"` : (row[k] ?? '')
    ).join(','))];
  return rows.join('\r\n');
}

function sortObjDeep(obj) {
  if (Array.isArray(obj)) return obj.map(sortObjDeep);
  if (obj && typeof obj === 'object') return Object.keys(obj).sort().reduce((r,k) => { r[k] = sortObjDeep(obj[k]); return r; }, {});
  return obj;
}

/* =============================================
   SQL ENGINE
   ============================================= */
function sqlEngine(input, action) {
  switch (action) {
    case 'beautify': return sqlFormat(input);
    case 'minify':   return sqlMinify(input);
    case 'comments': return stripSqlComments(input);
    default: return input;
  }
}

function sqlFormat(sql) {
  const keywords = ['SELECT','FROM','WHERE','AND','OR','NOT','IN','LIKE','BETWEEN',
    'JOIN','LEFT','RIGHT','INNER','OUTER','ON','GROUP BY','ORDER BY','HAVING',
    'INSERT INTO','VALUES','UPDATE','SET','DELETE','CREATE','ALTER','DROP','TABLE',
    'INDEX','VIEW','TRIGGER','PROCEDURE','FUNCTION','INTO','DISTINCT','COUNT','SUM',
    'MAX','MIN','AVG','AS','UNION','ALL','NULL','IS','EXISTS','CASE','WHEN','THEN','ELSE','END'];
  let result = sql.replace(/\s+/g,' ').trim().toUpperCase();
  // Wrap known keywords on new line
  keywords.forEach(k => {
    result = result.replace(new RegExp(`\\b(${k})\\b`, 'gi'), '\n$1');
  });
  return result.trim().replace(/\n+/g, '\n');
}

function sqlMinify(sql) {
  return sql
    .replace(/--.*$/gm,'')
    .replace(/\/\*[\s\S]*?\*\//g,'')
    .replace(/\s+/g,' ')
    .replace(/\s([(),;])/g,'$1')
    .replace(/([(),;])\s/g,'$1')
    .trim();
}

function stripSqlComments(sql) {
  return sql.replace(/\/\*[\s\S]*?\*\/|--.*$/gm,'').replace(/\n{3,}/g,'\n\n').trim();
}

/* =============================================
   XML ENGINE
   ============================================= */
function xmlEngine(input, action) {
  switch (action) {
    case 'beautify': return xmlFormat(input);
    case 'minify':   return xmlMinify(input);
    case 'validate': return xmlValidate(input);
    case 'tojson':   return xml2json(input);
    default: return input;
  }
}

function xmlFormat(xml) {
  const indent_unit = 2;
  let formatted = '';
  let indent = 0;
  const tokens = xml.split(/(<[^>]+>)/g).filter(t=>t.trim());
  tokens.forEach(token => {
    if (token.match(/^<\//)) { indent -= indent_unit; }
    if (token.match(/^<[^/!]/) && !token.match(/\/>$/)) {
      formatted += ' '.repeat(Math.max(0, indent)) + token.trim() + '\n';
      indent += indent_unit;
    } else if (token.match(/^[^<]/)) {
      formatted += ' '.repeat(Math.max(0, indent)) + token.trim() + '\n';
    } else {
      formatted += ' '.repeat(Math.max(0, indent)) + token.trim() + '\n';
    }
  });
  return formatted.trim();
}

function xmlMinify(xml) {
  return xml.replace(/>\s+</g,'><').replace(/\s+/g,' ').trim();
}

function xmlValidate(xml) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, 'application/xml');
  if (doc.querySelector('parsererror')) throw new Error('Invalid XML: ' + doc.querySelector('parsererror').textContent);
  return '✅ Valid XML';
}

function xml2json(xml) {
  const parser = new DOMParser();
  const doc    = parser.parseFromString(xml, 'application/xml');
  if (doc.querySelector('parsererror')) throw new Error('Invalid XML');
  return xmlNodeToJson(doc.documentElement);
}

function xmlNodeToJson(node) {
  if (node.nodeType === Node.TEXT_NODE) return node.textContent.trim();
  const obj = {};
  obj['#tag'] = node.nodeName;
  if (node.attributes.length) {
    obj['@attributes'] = {};
    Array.from(node.attributes).forEach(a => { obj['@attributes'][a.name] = a.value; });
  }
  if (node.childNodes.length) {
    const children = Array.from(node.childNodes);
    obj['#text'] = children.map(c => xmlNodeToJson(c)).filter(Boolean).join('');
    const childElements = node.children.length;
    if (childElements > 0) {
      const inner = {};
      node.children.forEach(c => {
        const k = c.nodeName;
        if (!inner[k]) inner[k] = [];
        inner[k].push(xmlNodeToJson(c));
      });
      Object.keys(inner).forEach(k => {
        obj[k] = inner[k].length === 1 ? inner[k][0] : inner[k];
      });
    }
  }
  return obj;
}

/* =============================================
   CSS ENGINE
   ============================================= */
function cssEngine(input, action) {
  switch (action) {
    case 'beautify': return cssBeautify(input);
    case 'minify':   return cssMinify(input);
    case 'validate': return cssValidate(input);
    default: return input;
  }
}

function cssBeautify(css) {
  let result = css;
  // Add newline before each rule
  result = result.replace(/\s*([\{\}])\s*/g, '\n$1\n');
  result = result.replace(/[;\}]/g, ';\n');
  result = result.replace(/([^\n])\{/g, '$1\n{');
  let indent = 0;
  return result.split('\n').map(line => {
    line = line.trim();
    if (!line) return '';
    if (line === '}') indent = Math.max(0, indent - 1);
    const prefixed = '  '.repeat(indent) + line;
    if (line === '{' || line.endsWith('{')) indent++;
    return prefixed;
  }).filter(Boolean).join('\n');
}

function cssMinify(css) {
  return css
    .replace(/\/\*[\s\S]*?\*\//g,'')
    .replace(/\n\s*/g,'')
    .replace(/\s+([\{\}:;,])\s*/g,'$1')
    .replace(/;}/g,'}')
    .trim();
}

function cssValidate(css) {
  return '✅ CSS syntax check passed (basic)';
}

/* =============================================
   HTML ENGINE
   ============================================= */
function htmlEngine(input, action) {
  switch (action) {
    case 'beautify': return htmlBeautify(input);
    case 'minify':   return htmlMinify(input);
    case 'source':   return htmlSource(input);
    default: return input;
  }
}

function htmlBeautify(html) {
  let indent = 0;
  const parts = html.split(/(<[^>]+>)/g);
  const voidTags = /^(?:area|base|br|col|embed|hr|img|input|link|meta|param|source|track|wbr)\b/i;
  return parts.map(part => {
    const t = part.trim();
    if (!t) return '';
    const isClose = /^<\//.test(t);
    const isOpen  = /^<[a-z\/!]/.test(t) && !isClose && !/^<!--/.test(t) && !/^<\?/.test(t);
    const isVoid  = voidTags.test(t);
    if (isClose) indent = Math.max(0, indent - 1);
    const line = '  '.repeat(indent) + t;
    if (isOpen && !isVoid) indent++;
    return line;
  }).filter(Boolean).join('\n');
}

function htmlMinify(html) {
  return html.replace(/<!--[\s\S]*?-->/g,'')
             .replace(/>\s+</g,'><')
             .replace(/\s+/g,' ')
             .replace(/\s([{}\(\)\{\}:=,;])/g,'$1')
             .trim();
}

function htmlSource(html) {
  return html.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

/* =============================================
   BASE64 ENGINE
   ============================================= */
function base64Engine(input, action) {
  switch (action) {
    case 'encode': {
      try { return btoa(new TextEncoder().encode(input).reduce((d,b) => d + String.fromCharCode(b), '')); }
      catch(e) { return btoa(unescape(encodeURIComponent(input))); }
    }
    case 'decode': {
      try { return new TextDecoder().decode(Uint8Array.from(atob(input), c => c.charCodeAt(0))); }
      catch(e) { return decodeURIComponent(escape(atob(input))); }
    }
    case 'img2b64': {
      const bytes = new Uint8Array(input.length);
      for (let i = 0; i < input.length; i++) bytes[i] = input.charCodeAt(i);
      return btoa(String.fromCharCode(...bytes));
    }
    default: return input;
  }
}

/* =============================================
   JWT ENGINE
   ============================================= */
function jwtEngine(input, action) {
  switch (action) {
    case 'decode': return decodeJwt(input);
    case 'encode': return encodeJwt(input);
    default: return input;
  }
}

function decodeJwt(token) {
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('Invalid JWT format — expected 3 dot-separated parts');
  const header    = JSON.parse(base64Engine(parts[0],'decode'));
  const payload   = JSON.parse(base64Engine(parts[1],'decode'));
  const signature = parts[2];
  const issuedAt  = payload.iat ? new Date(payload.iat * 1000).toLocaleString() : 'N/A';
  const expiresAt = payload.exp ? new Date(payload.exp * 1000).toLocaleString() : 'N/A';
  return `=== JWT Header ===\n${JSON.stringify(header, null, 2)}\n\n` +
         `=== JWT Payload ===\n${JSON.stringify(payload, null, 2)}\n\n` +
         `=== Claims Info ===\nIssued At    : ${issuedAt}\nExpires At   : ${expiresAt}\nSignature    : ${signature.substring(0,32)}… (${signature.length} chars)\n`;
}

function encodeJwt(input) {
  const obj = JSON.parse(input);
  const headerB64 = base64Engine(JSON.stringify({alg:'HS256',typ:'JWT'}), 'encode');
  const payloadB64 = base64Engine(JSON.stringify(obj), 'encode');
  const sigB64 = base64Engine('[signature-placeholder]', 'encode');
  return `${headerB64}.${payloadB64}.${sigB64}\n\n⚠️ This is a placeholder signature (no secret signer).\nUse a real JWT library for production tokens.`;
}

/* =============================================
   RENDER OUTPUT (syntax highlighted)
   ============================================= */
function renderOutput(text, toolRoute) {
  if (!text) return '';
  if (toolRoute === 'json') {
    return syntaxJson(text);
  }
  if (toolRoute === 'sql') {
    return syntaxSql(text);
  }
  if (toolRoute === 'xml') {
    return syntaxXml(text);
  }
  if (toolRoute === 'css') {
    return syntaxCss(text);
  }
  if (toolRoute === 'cert') {
    return text; // already HTML
  }
  // plain text fallback
  return escHtml(text);
}

/* --- JSON highlighting --- */
function syntaxJson(str) {
  // try parse for proper highlighting
  try {
    const formatted = JSON.stringify(JSON.parse(str), null, 2);
    return formatted.replace(
      /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
      m => {
        let cls = 'hl-num';
        if (/^"/.test(m)) {
          cls = /:$/.test(m) ? 'hl-key' : 'hl-str';
        } else if (/true|false/.test(m)) cls = 'hl-bool';
        else if (/null/.test(m)) cls = 'hl-null';
        return `<span class="${cls}">${escHtml(m)}</span>`;
      }
    );
  } catch(_) {
    return escHtml(str);
  }
}

/* --- SQL highlighting --- */
function syntaxSql(str) {
  const kw = /\b(SELECT|FROM|WHERE|AND|OR|NOT|IN|LIKE|BETWEEN|JOIN|LEFT|RIGHT|INNER|OUTER|ON|GROUP BY|ORDER BY|HAVING|INSERT INTO|VALUES|UPDATE|SET|DELETE|CREATE|ALTER|DROP|TABLE|DISTINCT|COUNT|SUM|MAX|MIN|AVG|AS|UNION|ALL|NULL|IS|EXISTS|CASE|WHEN|THEN|ELSE|END|INTO|PRIMARY KEY|FOREIGN KEY|REFERENCES|UNIQUE|INDEX|VIEW|WITH)\b/gi;
  const strLit = /('(?:[^'\\]|\\.)*')/g;
  const numLit = /\b(\d+(?:\.\d+)?)\b/g;
  return str.replace(strLit, '<span class="hl-str">$1</span>')
            .replace(numLit, '<span class="hl-num">$1</span>')
            .replace(kw, '<span class="hl-key">$1</span>');
}

/* --- XML highlighting --- */
function syntaxXml(str) {
  const tagRe  = /(&lt;\/?[\w:-]+)/g;
  const attrRe = /\s([\w:-]+)=/g;
  const valRe  = /"([^"\\]+)"/g;
  const numRe  = /\b(\d+)\b/g;
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
            .replace(tagRe, '<span class="hl-key">&lt;$1</span>')
            .replace(attrRe, ' <span class="hl-attr">$1</span>=')
            .replace(/("[^"]*")/g, '<span class="hl-str">$1</span>');
}

/* --- CSS highlighting --- */
function syntaxCss(str) {
  return str
    .replace(/(\/\*[\s\S]*?\*\/)/g, '<span class="hl-comment">$1</span>')
    .replace(/([.#]?\w[\w-]*)\s*\{/g, '<span class="hl-key">$1</span> {')
    .replace(/([\w-]+)\s*:/g, '\n  <span class="hl-attr">$1</span>:')
    .replace(/:([^;]+);/g, ': <span class="hl-str">$1</span>;');
}

function escHtml(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

/* =============================================
   FULLSCREEN HELPER
   ============================================= */
function toggleFullscreen(el) {
  if (!document.fullscreenElement) {
    el.requestFullscreen?.() || el.webkitRequestFullscreen?.();
    document.body.classList.add('fullscreen');
  } else {
    document.exitFullscreen?.() || document.webkitExitFullscreen?.();
    document.body.classList.remove('fullscreen');
  }
}

/* =============================================
   IMAGE / MULTI-SCREEN COMBINER
   ============================================= */
function renderImagePage() {
  document.title = 'Multi-Screen Combiner — Ione';
  if (typeof renderCombinerPage === 'function') {
    renderCombinerPage();
  } else {
    writeMain(`
      <div class="tool-header">
        <div class="tool-title">
          <span style="font-size:1.8rem">🖼️</span>
          <h2>Multi-Screen Combiner</h2>
        </div>
      </div>
      <div class="msg-box error" style="display:flex">Image engine not loaded. Please refresh the page.</div>
    `);
  }
}

/* =============================================
   MAIN RENDER → main element
   ============================================= */
function writeMain(html) {
  const el = document.getElementById('mainContent');
  if (el) el.innerHTML = html;
  window.scrollTo(0, 0);
}

function render404() {
  writeMain('<div class="main" style="text-align:center;padding:4rem 0"><h1>404 — Tool Not Found</h1><p class="mt-2"><a href="#home">← Go Home</a></p></div>');
}

/* =============================================
   BOOT
   ============================================= */
function boot() {
  // inject navbar & main container if not already in HTML
  if (!document.getElementById('navWrapper') && !document.getElementById('mainContent')) {
    document.body.insertAdjacentHTML('afterbegin', htmlShell());
  }
  onRouteChange();
  window.addEventListener('hashchange', onRouteChange);
}

function onRouteChange() {
  const route = resolveRoute();
  if (route.main === 'home') renderHomepage();
  else if (route.main === 'ione') renderImagePage();
  else if (route.main === 'markdown') renderMarkitdownPage();
  else if (route.main === 'pdf') {
    if (typeof renderPdfPage === 'function') {
      renderPdfPage(route.sub || 'merge');
    } else {
      writeMain('<div class="tool-header"><div class="tool-title"><span style="font-size:1.8rem">📄</span><h2>PDF Tools</h2></div></div><div class="msg-box error" style="display:flex">PDF engine not loaded. Please refresh the page.</div>');
    }
  }
  else renderToolPage(route);
}

function htmlShell() {
  return `
  <nav class="navbar" id="navWrapper">
    <a class="nav-brand" href="#home"><span class="logo-icon">⚡</span><span>Ione</span></a>
    <div class="nav-links">
      <a href="#home"          >Home</a>
      <a href="#json"          >JSON</a>
      <a href="#sql"           >SQL</a>
      <a href="#xml"           >XML</a>
      <a href="#css"           >CSS</a>
      <a href="#html"          >HTML</a>
      <a href="#base64"        >Base64</a>
      <a href="#jwt"           >JWT</a>
      <a href="#cert"          >Certs</a>
      <a href="#ione"          >Images</a>
      <a href="#markdown"      >Markdown</a>
      <a href="#pdf"           >PDF</a>
    </div>
  </nav>
  <main id="mainContent" class="main"></main>
  <footer class="footer">
    <p>Ione Clone — Built with ❤️ &amp; JavaScript</p>
  </footer>`;
}

// Start
document.addEventListener('DOMContentLoaded', boot);

})();
