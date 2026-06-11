/* =============================================
   Ione — Markdown Engine
   Document to Markdown Converter using backend
   POST /api/markitdown
   ============================================= */
(function () {
'use strict';

function renderMarkitdownPage() {
  document.title = 'Document to Markdown — Ione';
  const writeFn = typeof writeMain === 'function' ? writeMain : function(html) {
    const el = document.getElementById('mainContent');
    if (el) el.innerHTML = html;
  };
  writeFn(`
    <div class="tool-header" id="mdToolHeader">
      <div class="tool-title">
        <span style="font-size:1.8rem">📝</span>
        <h2>Document to Markdown</h2>
      </div>
      <div class="tool-actions">
        <button class="btn btn-sm" id="mdBtnNew">⊹ New</button>
      </div>
    </div>
    <div class="msg-box error" id="mdMsgError" role="alert" style="display:none"></div>
    <div class="msg-box success" id="mdMsgSuccess" role="status" style="display:none"></div>
    <div class="msg-box info" id="mdMsgInfo" style="display:none"></div>
    <div class="img-dropzone" id="mdDropzone">
      <div class="img-dropzone-content">
        <span class="img-dropzone-icon">📄</span>
        <p><strong>Drop a document here</strong> or click to browse</p>
        <p class="img-dropzone-hint">Supports: PDF, DOCX, XLSX, PPTX, HTML, CSV, JSON, XML, EPUB, images, audio, ZIP</p>
      </div>
      <input type="file" id="mdFileInput" accept=".pdf,.docx,.xlsx,.pptx,.html,.csv,.json,.xml,.epub,.png,.jpg,.jpeg,.gif,.bmp,.svg,.webp,.tiff,.tif,.mp3,.wav,.ogg,.flac,.m4a,.zip" style="display:none">
    </div>
    <div style="display:flex;gap:.75rem;align-items:center;margin-bottom:.75rem;flex-wrap:wrap">
      <button class="btn btn-primary" id="mdBtnConvert">🔄 Convert to Markdown</button>
      <span id="mdFileInfo" style="font-size:.85rem;color:var(--text-muted)"></span>
    </div>
    <div class="editor-area" id="mdEditorArea" style="display:none">
      <div class="editor-panel" style="grid-column:1/-1">
        <div class="panel-header">
          <span class="panel-title">Markdown Output</span>
          <div class="panel-options">
            <button class="btn btn-sm" id="mdBtnCopy">📋 Copy</button>
            <button class="btn btn-sm" id="mdBtnDownload">⬇ Download .md</button>
          </div>
        </div>
        <div class="editor-body">
          <textarea id="mdOutput" style="height:400px" readonly spellcheck="false" placeholder="Markdown output will appear here…"></textarea>
        </div>
      </div>
    </div>
  `);
  bindMarkdownEvents();
}

function bindMarkdownEvents() {
  const dropzone = document.getElementById('mdDropzone');
  const fileInput = document.getElementById('mdFileInput');
  const convertBtn = document.getElementById('mdBtnConvert');
  let selectedFile = null;

  dropzone.addEventListener('click', () => fileInput.click());

  dropzone.addEventListener('dragover', e => {
    e.preventDefault();
    dropzone.classList.add('drag-over');
  });
  dropzone.addEventListener('dragleave', () => {
    dropzone.classList.remove('drag-over');
  });
  dropzone.addEventListener('drop', e => {
    e.preventDefault();
    dropzone.classList.remove('drag-over');
    if (e.dataTransfer.files.length) {
      selectFile(e.dataTransfer.files[0]);
    }
  });

  fileInput.addEventListener('change', e => {
    if (e.target.files.length) selectFile(e.target.files[0]);
    fileInput.value = '';
  });

  convertBtn.addEventListener('click', convertToMarkdown);

  document.getElementById('mdBtnNew')?.addEventListener('click', function () {
    selectedFile = null;
    document.getElementById('mdFileInfo').textContent = '';
    document.getElementById('mdEditorArea').style.display = 'none';
    document.getElementById('mdOutput').value = '';
    ['mdMsgError','mdMsgSuccess','mdMsgInfo'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.style.display = 'none';
    });
  });

  document.getElementById('mdBtnCopy')?.addEventListener('click', function () {
    var text = document.getElementById('mdOutput').value;
    if (!text) return;
    navigator.clipboard.writeText(text).then(function () {
      setMdInfo('Copied to clipboard!');
    });
  });

  document.getElementById('mdBtnDownload')?.addEventListener('click', function () {
    var text = document.getElementById('mdOutput').value;
    if (!text) return;
    var name = (selectedFile ? selectedFile.name : 'document').replace(/\.[^.]+$/, '') + '.md';
    var blob = new Blob([text], { type: 'text/markdown' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = name;
    a.click(); URL.revokeObjectURL(url);
  });

  function selectFile(file) {
    var MAX_BYTES = 50 * 1024 * 1024;
    if (file.size > MAX_BYTES) {
      setMdError('File too large. Maximum size is 50 MB.');
      selectedFile = null;
      document.getElementById('mdFileInfo').textContent = '';
      return;
    }
    selectedFile = file;
    document.getElementById('mdFileInfo').textContent = '\uD83D\uDCCE ' + file.name + ' (' + (file.size / 1024 / 1024).toFixed(1) + ' MB)';
    var el = document.getElementById('mdMsgError');
    if (el) el.style.display = 'none';
  }

  async function convertToMarkdown() {
    if (!selectedFile) {
      setMdError('Please select a file first.');
      return;
    }

    var errEl = document.getElementById('mdMsgError');
    if (errEl) errEl.style.display = 'none';
    var sucEl = document.getElementById('mdMsgSuccess');
    if (sucEl) sucEl.style.display = 'none';
    var infEl = document.getElementById('mdMsgInfo');
    if (infEl) infEl.style.display = 'none';

    convertBtn.disabled = true;
    convertBtn.innerHTML = '<span class="spinner spinner-dark"></span> Converting\u2026';

    try {
      var formData = new FormData();
      formData.append('file', selectedFile);

      var res = await fetch('/api/markitdown', {
        method: 'POST',
        body: formData
      });

      var data = await res.json();

      if (!res.ok || data.error) {
        var msg = data.error;
        if (!msg && res.status === 503) {
          msg = 'MarkItDown library not available. Please install it on the server (pip install markitdown).';
        }
        throw new Error(msg || 'Conversion failed.');
      }

      document.getElementById('mdOutput').value = data.markdown;
      document.getElementById('mdEditorArea').style.display = '';
      setMdSuccess('Converted "' + (data.filename || selectedFile.name) + '" to Markdown successfully!');
    } catch (err) {
      setMdError(friendlyFetchError(err));
      document.getElementById('mdEditorArea').style.display = 'none';
    } finally {
      convertBtn.disabled = false;
      convertBtn.textContent = '\uD83D\uDD04 Convert to Markdown';
    }
  }
}

function setMdError(msg) {
  var el = document.getElementById('mdMsgError');
  if (el) { el.textContent = '\u274C ' + msg; el.style.display = 'flex'; }
}
function setMdSuccess(msg) {
  var el = document.getElementById('mdMsgSuccess');
  if (el) { el.textContent = '\u2705 ' + msg; el.style.display = 'flex'; }
}
function setMdInfo(msg) {
  var el = document.getElementById('mdMsgInfo');
  if (el) { el.textContent = '\u2139\uFE0F ' + msg; el.style.display = 'flex'; }
}

function friendlyFetchError(err) {
  if (err instanceof TypeError || /failed to fetch|networkerror/i.test(err.message)) {
    return 'Cannot reach the ione server. Is it still running? Restart it with the "ione" command (default port 8311) and reload this page from the right URL.';
  }
  return err.message;
}

window.renderMarkitdownPage = renderMarkitdownPage;

})();
