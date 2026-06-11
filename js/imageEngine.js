/* =============================================
   Ione — Image Engine
   Multi-Screen Combiner: paste multiple images,
   arrange side-by-side, composite into one PNG.
   ============================================= */
(function () {
'use strict';

function imageEngine(input, action) {
  // This is handled by the combiner UI directly
  return input;
}

/* ----------------------------------------------------------------
   STATE
   ---------------------------------------------------------------- */
const state = {
  images: [],        // { id, dataUrl, name, width, height }
  spacing: 8,
  align: 'top',      // top | middle | bottom
  bgColor: '#ffffff',
  maxHeight: 800,
};

let nextId = 1;

/* ----------------------------------------------------------------
   RENDER THE COMBINER PAGE
   ---------------------------------------------------------------- */
function renderCombinerPage() {
  const container = document.getElementById('mainContent');
  if (!container) return;

  container.innerHTML = `
    <div class="tool-header" id="toolHeader">
      <div class="tool-title">
        <span style="font-size:1.8rem">🖼️</span>
        <h2>Multi-Screen Combiner</h2>
      </div>
      <div class="tool-actions">
        <button class="btn btn-sm" id="imgBtnNew">⊹ New</button>
        <button class="btn btn-sm" id="imgBtnClear">🗑 Clear All</button>
      </div>
    </div>

    <div class="msg-box info" id="imgMsgInfo"></div>
    <div class="msg-box error" id="imgMsgError"></div>

    <!-- Drop zone -->
    <div class="img-dropzone" id="imgDropzone">
      <div class="img-dropzone-content">
        <span class="img-dropzone-icon">📸</span>
        <p><strong>Drop images here</strong> or click to browse</p>
        <p class="img-dropzone-hint">Paste from clipboard with Ctrl+V / Cmd+V</p>
      </div>
      <input type="file" id="imgFileInput" accept="image/*" multiple style="display:none">
    </div>

    <!-- Options bar -->
    <div class="img-options" id="imgOptions">
      <label>Spacing:
        <input type="range" id="imgSpacing" min="0" max="40" value="${state.spacing}">
        <span id="imgSpacingVal">${state.spacing}px</span>
      </label>
      <label>Align:
        <select id="imgAlign">
          <option value="top">Top</option>
          <option value="middle">Middle</option>
          <option value="bottom">Bottom</option>
        </select>
      </label>
      <label>Max H:
        <select id="imgMaxH">
          <option value="400">400px</option>
          <option value="600">600px</option>
          <option value="800" selected>800px</option>
          <option value="1200">1200px</option>
          <option value="0">Full</option>
        </select>
      </label>
      <label>Bg:
        <input type="color" id="imgBgColor" value="${state.bgColor}">
      </label>
      <button class="btn btn-sm btn-primary" id="imgBtnComposite">🔄 Composite & Download</button>
    </div>

    <!-- Image list -->
    <div class="img-list" id="imgList">
      <p class="img-list-empty">No images added yet. Drop or paste some screenshots!</p>
    </div>

    <!-- Preview -->
    <div class="img-preview-wrap" id="imgPreviewWrap" style="display:none">
      <h3 class="section-heading">Preview</h3>
      <div class="img-preview" id="imgPreview"></div>
    </div>
  `;

  bindCombinerEvents();
}

/* ----------------------------------------------------------------
   BIND EVENTS
   ---------------------------------------------------------------- */
function bindCombinerEvents() {
  const dropzone = document.getElementById('imgDropzone');
  const fileInput = document.getElementById('imgFileInput');

  // Click dropzone → open file picker
  dropzone.addEventListener('click', () => fileInput.click());

  // Drag events
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
      handleFiles(e.dataTransfer.files);
    }
  });

  // File input
  fileInput.addEventListener('change', e => {
    if (e.target.files.length) handleFiles(e.target.files);
    fileInput.value = '';
  });

  // Paste from clipboard
  document.addEventListener('paste', onPaste);

  // Controls
  document.getElementById('imgSpacing').addEventListener('input', e => {
    state.spacing = parseInt(e.target.value);
    document.getElementById('imgSpacingVal').textContent = state.spacing + 'px';
    renderPreview();
  });
  document.getElementById('imgAlign').addEventListener('change', e => {
    state.align = e.target.value;
    renderPreview();
  });
  document.getElementById('imgMaxH').addEventListener('change', e => {
    state.maxHeight = parseInt(e.target.value) || 800;
    renderPreview();
  });
  document.getElementById('imgBgColor').addEventListener('input', e => {
    state.bgColor = e.target.value;
    renderPreview();
  });

  // Composite button
  document.getElementById('imgBtnComposite').addEventListener('click', compositeAndDownload);

  // New / Clear
  document.getElementById('imgBtnNew').addEventListener('click', () => {
    state.images = [];
    renderImageList();
    hidePreview();
  });
  document.getElementById('imgBtnClear').addEventListener('click', () => {
    state.images = [];
    renderImageList();
    hidePreview();
  });
}

/* ----------------------------------------------------------------
   HANDLE IMAGES FROM FILE / DROP / PASTE
   ---------------------------------------------------------------- */
function handleFiles(files) {
  Array.from(files).forEach(file => {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = e => {
      addImage(e.target.result, file.name);
    };
    reader.readAsDataURL(file);
  });
}

function onPaste(e) {
  // Only handle paste inside the combiner page
  if (!document.getElementById('imgDropzone')) return;
  const items = e.clipboardData?.items;
  if (!items) return;
  Array.from(items).forEach(item => {
    if (item.type.startsWith('image/')) {
      const blob = item.getAsFile();
      if (blob) {
        const reader = new FileReader();
        reader.onload = ev => addImage(ev.target.result, 'Pasted image');
        reader.readAsDataURL(blob);
      }
    }
  });
}

function addImage(dataUrl, name) {
  const img = new Image();
  img.onload = () => {
    state.images.push({
      id: nextId++,
      dataUrl,
      name: name || `Image ${nextId - 1}`,
      width: img.naturalWidth,
      height: img.naturalHeight,
    });
    renderImageList();
    renderPreview();
  };
  img.src = dataUrl;
}

/* ----------------------------------------------------------------
   RENDER IMAGE LIST (thumbnails)
   ---------------------------------------------------------------- */
function renderImageList() {
  const list = document.getElementById('imgList');
  if (!list) return;

  if (state.images.length === 0) {
    list.innerHTML = '<p class="img-list-empty">No images added yet. Drop or paste some screenshots!</p>';
    document.getElementById('imgPreviewWrap').style.display = 'none';
    return;
  }

  list.innerHTML = state.images.map((img, idx) => `
    <div class="img-list-item" data-id="${img.id}">
      <span class="img-list-idx">#${idx + 1}</span>
      <img class="img-list-thumb" src="${img.dataUrl}" alt="${img.name}">
      <span class="img-list-name">${img.name}</span>
      <span class="img-list-dims">${img.width}×${img.height}</span>
      <div class="img-list-actions">
        <button class="btn btn-sm img-btn-move" data-id="${img.id}" data-dir="left" ${idx === 0 ? 'disabled' : ''}>◀</button>
        <button class="btn btn-sm img-btn-move" data-id="${img.id}" data-dir="right" ${idx === state.images.length - 1 ? 'disabled' : ''}>▶</button>
        <button class="btn btn-sm btn-danger img-btn-remove" data-id="${img.id}">✕</button>
      </div>
    </div>
  `).join('');

  // Bind move buttons
  list.querySelectorAll('.img-btn-move').forEach(btn => {
    btn.addEventListener('click', e => {
      const id = parseInt(btn.dataset.id);
      const dir = btn.dataset.dir;
      moveImage(id, dir);
    });
  });

  // Bind remove buttons
  list.querySelectorAll('.img-btn-remove').forEach(btn => {
    btn.addEventListener('click', e => {
      const id = parseInt(btn.dataset.id);
      removeImage(id);
    });
  });
}

function moveImage(id, dir) {
  const idx = state.images.findIndex(i => i.id === id);
  if (idx === -1) return;
  const newIdx = dir === 'left' ? idx - 1 : idx + 1;
  if (newIdx < 0 || newIdx >= state.images.length) return;
  [state.images[idx], state.images[newIdx]] = [state.images[newIdx], state.images[idx]];
  renderImageList();
  renderPreview();
}

function removeImage(id) {
  state.images = state.images.filter(i => i.id !== id);
  renderImageList();
  if (state.images.length > 0) renderPreview();
  else hidePreview();
}

function hidePreview() {
  const wrap = document.getElementById('imgPreviewWrap');
  if (wrap) wrap.style.display = 'none';
}

/* ----------------------------------------------------------------
   RENDER PREVIEW (canvas)
   ---------------------------------------------------------------- */
function renderPreview() {
  if (state.images.length === 0) return;
  const wrap = document.getElementById('imgPreviewWrap');
  const canvas = document.getElementById('imgPreview');
  if (!wrap) return;
  wrap.style.display = 'block';

  // Clear old canvas
  const container = document.getElementById('imgPreview');
  container.innerHTML = '';

  // Create offscreen canvas to composite
  const maxH = state.maxHeight > 0 ? state.maxHeight : Infinity;
  const spacing = state.spacing;

  // Load all images and composite
  loadAllImages().then(loaded => {
    if (loaded.length === 0) return;

    // Calculate dimensions
    const totalWidth = loaded.reduce((sum, img) => sum + img.displayW, 0) + spacing * (loaded.length - 1);
    const totalHeight = Math.max(...loaded.map(img => img.displayH));

    const compCanvas = document.createElement('canvas');
    compCanvas.width = totalWidth;
    compCanvas.height = totalHeight;
    const ctx = compCanvas.getContext('2d');

    // Background
    ctx.fillStyle = state.bgColor;
    ctx.fillRect(0, 0, totalWidth, totalHeight);

    // Composite images
    let x = 0;
    loaded.forEach(img => {
      let y = 0;
      if (state.align === 'middle') y = (totalHeight - img.displayH) / 2;
      else if (state.align === 'bottom') y = totalHeight - img.displayH;

      ctx.drawImage(img.element, 0, 0, img.width, img.height, x, y, img.displayW, img.displayH);
      x += img.displayW + spacing;
    });

    // Show preview
    const previewImg = document.createElement('img');
    previewImg.src = compCanvas.toDataURL('image/png');
    previewImg.style.maxWidth = '100%';
    previewImg.style.border = '1px solid var(--border)';
    previewImg.style.borderRadius = 'var(--radius)';
    container.appendChild(previewImg);

    // Store for download
    container._compositeCanvas = compCanvas;
  });
}

function loadAllImages() {
  const maxH = state.maxHeight > 0 ? state.maxHeight : Infinity;
  return Promise.all(state.images.map(img => {
    return new Promise(resolve => {
      const el = new Image();
      el.onload = () => {
        const scale = maxH < el.naturalHeight ? maxH / el.naturalHeight : 1;
        resolve({
          element: el,
          width: el.naturalWidth,
          height: el.naturalHeight,
          displayW: Math.round(el.naturalWidth * scale),
          displayH: Math.round(el.naturalHeight * scale),
        });
      };
      el.onerror = () => resolve(null);
      el.src = img.dataUrl;
    });
  })).then(results => results.filter(Boolean));
}

/* ----------------------------------------------------------------
   COMPOSITE & DOWNLOAD
   ---------------------------------------------------------------- */
function compositeAndDownload() {
  const container = document.getElementById('imgPreview');
  if (!container || !container._compositeCanvas) {
    setImgError('Add at least one image first!');
    return;
  }

  const canvas = container._compositeCanvas;
  const link = document.createElement('a');
  link.download = `ione-composite-${state.images.length}screens.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
  setImgInfo('✅ Composite downloaded!');
}

/* ----------------------------------------------------------------
   MESSAGES
   ---------------------------------------------------------------- */
function setImgError(msg) {
  const el = document.getElementById('imgMsgError');
  if (el) { el.textContent = '❌ ' + msg; el.style.display = 'flex'; }
}
function setImgInfo(msg) {
  const el = document.getElementById('imgMsgInfo');
  if (el) { el.textContent = '✅ ' + msg; el.style.display = 'flex'; }
}

/* ----------------------------------------------------------------
   EXPOSE
   ---------------------------------------------------------------- */
window.imageEngine = imageEngine;
window.renderCombinerPage = renderCombinerPage;

})();
