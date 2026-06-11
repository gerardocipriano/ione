/* =============================================
   Ione — PDF Tools Engine
   Backend endpoints at /api/pdf/*
   ============================================= */
(function () {
'use strict';

var PDF_TOOLS = [
  { id:'merge',   label:'Merge PDFs',     icon:'📄' },
  { id:'split',   label:'Split PDF',      icon:'✂️' },
  { id:'extract', label:'Extract Pages',  icon:'📋' },
  { id:'delete',  label:'Remove Pages',   icon:'🗑️' },
  { id:'rotate',  label:'Rotate PDF',     icon:'🔄' },
  { id:'compress',label:'Compress PDF',   icon:'🗜️' },
  { id:'sign',    label:'Sign PDF',       icon:'✍️' },
  { id:'form',    label:'Fill PDF Form',   icon:'🖊️' },
];

function renderPdfPage(subTool) {
  subTool = subTool || 'merge';
  var active = PDF_TOOLS.find(function(t) { return t.id === subTool; });
  if (!active) subTool = 'merge';
  active = active || PDF_TOOLS[0];

  document.title = active.label + ' — Ione';
  var writeFn = typeof writeMain === 'function' ? writeMain : function(html) {
    var el = document.getElementById('mainContent');
    if (el) el.innerHTML = html;
  };

  writeFn(buildSubNav(subTool) + buildToolContent(subTool));
  bindPdfEvents(subTool);
}

function buildSubNav(current) {
  var links = PDF_TOOLS.map(function(t) {
    var active = t.id === current ? ' class="pdf-sub-active"' : '';
    return '<a href="#pdf/' + t.id + '"' + active + '>' + t.icon + ' ' + t.label + '</a>';
  }).join('');
  return '<div class="pdf-sub-nav">' + links + '</div>';
}

function buildToolContent(sub) {
  var tool = PDF_TOOLS.find(function(t) { return t.id === sub; }) || PDF_TOOLS[0];
  var dropzoneHtml = '';
  var controlsHtml = '';
  var actionLabel = '';

  switch (sub) {
    case 'merge':
      dropzoneHtml = '<div class="img-dropzone" id="pdfDropzone">'
        + '<div class="img-dropzone-content">'
        + '<span class="img-dropzone-icon">📄</span>'
        + '<p><strong>Drop PDF files here</strong> or click to browse</p>'
        + '<p class="img-dropzone-hint">Select multiple files to merge</p>'
        + '</div>'
        + '<input type="file" id="pdfFileInput" accept=".pdf" multiple style="display:none">'
        + '</div>'
        + '<div id="pdfFileList" class="pdf-file-list"></div>';
      actionLabel = '📄 Merge PDFs';
      break;
    case 'split':
      dropzoneHtml = '<div class="img-dropzone" id="pdfDropzone">'
        + '<div class="img-dropzone-content">'
        + '<span class="img-dropzone-icon">📄</span>'
        + '<p><strong>Drop a PDF here</strong> or click to browse</p>'
        + '<p class="img-dropzone-hint">Each page becomes a separate PDF file</p>'
        + '</div>'
        + '<input type="file" id="pdfFileInput" accept=".pdf" style="display:none">'
        + '</div>';
      actionLabel = '✂️ Split PDF';
      break;
    case 'extract':
      dropzoneHtml = '<div class="img-dropzone" id="pdfDropzone">'
        + '<div class="img-dropzone-content">'
        + '<span class="img-dropzone-icon">📄</span>'
        + '<p><strong>Drop a PDF here</strong> or click to browse</p>'
        + '</div>'
        + '<input type="file" id="pdfFileInput" accept=".pdf" style="display:none">'
        + '</div>';
      controlsHtml = '<div class="pdf-controls" style="margin-bottom:.75rem">'
        + '<label style="font-size:.85rem;display:block;margin-bottom:.25rem">Pages to extract:</label>'
        + '<input type="text" id="pdfPages" placeholder="e.g. 1,3,5-9" style="width:100%;padding:.5rem;border:1px solid var(--border);border-radius:4px;background:var(--bg-card)">'
        + '</div>';
      actionLabel = '📋 Extract Pages';
      break;
    case 'delete':
      dropzoneHtml = '<div class="img-dropzone" id="pdfDropzone">'
        + '<div class="img-dropzone-content">'
        + '<span class="img-dropzone-icon">📄</span>'
        + '<p><strong>Drop a PDF here</strong> or click to browse</p>'
        + '</div>'
        + '<input type="file" id="pdfFileInput" accept=".pdf" style="display:none">'
        + '</div>';
      controlsHtml = '<div class="pdf-controls" style="margin-bottom:.75rem">'
        + '<label style="font-size:.85rem;display:block;margin-bottom:.25rem">Pages to remove:</label>'
        + '<input type="text" id="pdfPages" placeholder="e.g. 1,3,5-9" style="width:100%;padding:.5rem;border:1px solid var(--border);border-radius:4px;background:var(--bg-card)">'
        + '</div>';
      actionLabel = '🗑️ Remove Pages';
      break;
    case 'rotate':
      dropzoneHtml = '<div class="img-dropzone" id="pdfDropzone">'
        + '<div class="img-dropzone-content">'
        + '<span class="img-dropzone-icon">📄</span>'
        + '<p><strong>Drop a PDF here</strong> or click to browse</p>'
        + '</div>'
        + '<input type="file" id="pdfFileInput" accept=".pdf" style="display:none">'
        + '</div>';
      controlsHtml = '<div class="pdf-controls" style="margin-bottom:.75rem">'
        + '<label style="font-size:.85rem;display:block;margin-bottom:.25rem">Angle:</label>'
        + '<select id="pdfAngle" style="width:100%;padding:.5rem;border:1px solid var(--border);border-radius:4px;background:var(--bg-card);margin-bottom:.5rem">'
        + '<option value="90">90°</option>'
        + '<option value="180">180°</option>'
        + '<option value="270">270°</option>'
        + '</select>'
        + '<label style="font-size:.85rem;display:block;margin-bottom:.25rem">Pages (optional, leave empty for all):</label>'
        + '<input type="text" id="pdfPages" placeholder="e.g. 1,3,5-9" style="width:100%;padding:.5rem;border:1px solid var(--border);border-radius:4px;background:var(--bg-card)">'
        + '</div>';
      actionLabel = '🔄 Rotate PDF';
      break;
    case 'compress':
      dropzoneHtml = '<div class="img-dropzone" id="pdfDropzone">'
        + '<div class="img-dropzone-content">'
        + '<span class="img-dropzone-icon">📄</span>'
        + '<p><strong>Drop a PDF here</strong> or click to browse</p>'
        + '</div>'
        + '<input type="file" id="pdfFileInput" accept=".pdf" style="display:none">'
        + '</div>';
      actionLabel = '🗜️ Compress PDF';
      break;
    case 'sign':
      dropzoneHtml = '<div class="img-dropzone" id="pdfDropzone">'
        + '<div class="img-dropzone-content">'
        + '<span class="img-dropzone-icon">📄</span>'
        + '<p><strong>Drop a PDF here</strong> or click to browse</p>'
        + '</div>'
        + '<input type="file" id="pdfFileInput" accept=".pdf" style="display:none">'
        + '</div>'
        + '<div id="pdfSignPreview" style="display:none">'
        + '<div style="display:flex;gap:.5rem;align-items:center;margin-bottom:.5rem;flex-wrap:wrap">'
        + '<button class="btn btn-sm" id="pdfPrevPage" type="button">◀</button>'
        + '<span id="pdfPageIndicator" style="font-size:.85rem">Page 1 of 1</span>'
        + '<button class="btn btn-sm" id="pdfNextPage" type="button">▶</button>'
        + '<button class="btn btn-sm" id="pdfChangePdf" type="button">Change PDF</button>'
        + '</div>'
        + '<div id="pdfSignPreviewContainer" style="position:relative;display:inline-block;max-width:100%;overflow:hidden">'
        + '<canvas id="pdfPreviewCanvas" style="display:block;border:1px solid var(--border);border-radius:4px"></canvas>'
        + '<img id="pdfSigOverlay" style="position:absolute;display:none;cursor:move;border:2px dashed rgba(0,0,0,.3);touch-action:none">'
        + '</div>'
        + '</div>';
      controlsHtml = '<div class="img-dropzone" id="pdfSigDropzone" style="margin-bottom:.75rem">'
        + '<div class="img-dropzone-content" id="pdfSigDropzoneContent">'
        + '<span class="img-dropzone-icon">✍️</span>'
        + '<p><strong>Drop signature image here</strong> or click to browse</p>'
        + '<p class="img-dropzone-hint">Supports: PNG, JPG, WebP</p>'
        + '</div>'
        + '<input type="file" id="pdfSigInput" accept=".png,.jpg,.jpeg,.webp" style="display:none">'
        + '</div>';
      actionLabel = '✍️ Sign and Download';
      break;
    case 'form':
      dropzoneHtml = '<div class="img-dropzone" id="pdfDropzone">'
        + '<div class="img-dropzone-content">'
        + '<span class="img-dropzone-icon">📄</span>'
        + '<p><strong>Drop a PDF here</strong> or click to browse</p>'
        + '<p class="img-dropzone-hint">PDF with fillable form fields</p>'
        + '</div>'
        + '<input type="file" id="pdfFileInput" accept=".pdf" style="display:none">'
        + '</div>';
      controlsHtml = '<div class="pdf-controls" id="pdfFormFieldsArea" style="max-width:600px;margin-bottom:.75rem"></div>';
      actionLabel = '🖊️ Fill and Download';
      break;
  }

  var actionRow = '<div style="display:flex;gap:.75rem;align-items:center;margin-bottom:.75rem;flex-wrap:wrap">'
    + '<button class="btn btn-primary" id="pdfBtnAction">' + actionLabel + '</button>'
    + '<span id="pdfFileInfo" style="font-size:.85rem;color:var(--text-muted)"></span>'
    + '</div>';

  return '<div class="tool-header">'
    + '<div class="tool-title"><span style="font-size:1.8rem">' + tool.icon + '</span><h2>' + tool.label + '</h2></div>'
    + '</div>'
    + '<div class="msg-box error" id="pdfMsgError" role="alert" style="display:none"></div>'
    + '<div class="msg-box success" id="pdfMsgSuccess" role="status" style="display:none"></div>'
    + '<div class="msg-box info" id="pdfMsgInfo" style="display:none"></div>'
    + dropzoneHtml
    + controlsHtml
    + actionRow;
}

function bindPdfEvents(sub) {
  var dropzone = document.getElementById('pdfDropzone');
  var fileInput = document.getElementById('pdfFileInput');
  var actionBtn = document.getElementById('pdfBtnAction');
  var selectedPdfFile = null;
  var mergeFiles = [];
  var formFieldsData = null;
  var formInitialValues = {};
  var signLoadPdf = null;
  var signExecute = null;

  if (!dropzone || !fileInput || !actionBtn) return;

  function clearMessages() {
    ['pdfMsgError','pdfMsgSuccess','pdfMsgInfo'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.style.display = 'none';
    });
  }

  if (sub === 'merge') {
    dropzone.addEventListener('click', function() { fileInput.click(); });
    dropzone.addEventListener('dragover', function(e) { e.preventDefault(); dropzone.classList.add('drag-over'); });
    dropzone.addEventListener('dragleave', function() { dropzone.classList.remove('drag-over'); });
    dropzone.addEventListener('drop', function(e) {
      e.preventDefault();
      dropzone.classList.remove('drag-over');
      if (e.dataTransfer.files.length) handleMergeFiles(e.dataTransfer.files);
    });
    fileInput.addEventListener('change', function(e) {
      if (e.target.files.length) handleMergeFiles(e.target.files);
      fileInput.value = '';
    });
  } else {
    dropzone.addEventListener('click', function() { fileInput.click(); });
    dropzone.addEventListener('dragover', function(e) { e.preventDefault(); dropzone.classList.add('drag-over'); });
    dropzone.addEventListener('dragleave', function() { dropzone.classList.remove('drag-over'); });
    dropzone.addEventListener('drop', function(e) {
      e.preventDefault();
      dropzone.classList.remove('drag-over');
      if (e.dataTransfer.files.length) handleFileSelect(e.dataTransfer.files[0]);
    });
    fileInput.addEventListener('change', function(e) {
      if (e.target.files.length) handleFileSelect(e.target.files[0]);
      fileInput.value = '';
    });
  }

  function handleFileSelect(file) {
    var MAX_BYTES = 50 * 1024 * 1024;
    if (file.size > MAX_BYTES) {
      setPdfError('File too large. Maximum size is 50 MB.');
      selectedPdfFile = null;
      var infoEl = document.getElementById('pdfFileInfo');
      if (infoEl) infoEl.textContent = '';
      return;
    }
    selectedPdfFile = file;
    var infoEl = document.getElementById('pdfFileInfo');
    if (infoEl) infoEl.textContent = '\uD83D\uDCCE ' + file.name + ' (' + (file.size / 1024 / 1024).toFixed(1) + ' MB)';
    clearMessages();
    if (sub === 'form') {
      formFieldsData = null;
      formInitialValues = {};
      fetchFormFields(file);
    }
    if (sub === 'sign' && signLoadPdf) {
      signLoadPdf(file);
    }
  }

  function handleMergeFiles(fileList) {
    var MAX_BYTES = 50 * 1024 * 1024;
    var currentTotal = mergeFiles.reduce(function(sum, f) { return sum + f.size; }, 0);
    var listEl = document.getElementById('pdfFileList');
    if (!listEl) return;

    Array.from(fileList).forEach(function(file) {
      if (currentTotal + file.size > MAX_BYTES) {
        setPdfError('Total file size exceeds 50 MB limit.');
        return;
      }
      currentTotal += file.size;
      mergeFiles.push(file);
    });

    renderMergeList();
    clearMessages();
    var infoEl = document.getElementById('pdfFileInfo');
    if (infoEl) infoEl.textContent = mergeFiles.length + ' file(s) selected';
  }

  function renderMergeList() {
    var listEl = document.getElementById('pdfFileList');
    if (!listEl) return;
    listEl.innerHTML = '';
    mergeFiles.forEach(function(file, i) {
      var item = document.createElement('div');
      item.className = 'pdf-file-item';
      item.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding:.4rem .6rem;margin-bottom:.25rem;background:var(--bg-card);border:1px solid var(--border);border-radius:4px;font-size:.85rem';
      item.innerHTML = '<span>' + (i + 1) + '. ' + file.name + ' (' + (file.size / 1024 / 1024).toFixed(1) + ' MB)</span>'
        + '<button class="btn btn-sm pdf-remove-btn" data-index="' + i + '" style="color:var(--danger);border:0;background:none;cursor:pointer;font-size:1.1rem">✕</button>';
      listEl.appendChild(item);
    });
    listEl.querySelectorAll('.pdf-remove-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var idx = parseInt(this.dataset.index);
        mergeFiles.splice(idx, 1);
        renderMergeList();
        var infoEl = document.getElementById('pdfFileInfo');
        if (infoEl) infoEl.textContent = mergeFiles.length > 0 ? mergeFiles.length + ' file(s) selected' : '';
      });
    });
  }

  if (sub === 'sign') {
    var sigArrayBuffer = null;
    var sigMimeType = null;
    var sigNaturalWidth = 0;
    var sigNaturalHeight = 0;
    var sigDataUrl = null;
    var currentPageNum = 1;
    var totalPages = 0;
    var pdfDocPdfJs = null;
    var pdfPageWidth = 0;
    var pdfPageHeight = 0;
    var canvasWidth = 0;
    var canvasHeight = 0;
    var overlayImg = document.getElementById('pdfSigOverlay');
    var previewArea = document.getElementById('pdfSignPreview');
    var previewContainer = document.getElementById('pdfSignPreviewContainer');
    var canvas = document.getElementById('pdfPreviewCanvas');
    var prevBtn = document.getElementById('pdfPrevPage');
    var nextBtn = document.getElementById('pdfNextPage');
    var pageIndicator = document.getElementById('pdfPageIndicator');
    var changePdfBtn = document.getElementById('pdfChangePdf');
    var sigDropzone = document.getElementById('pdfSigDropzone');
    var sigInput = document.getElementById('pdfSigInput');
    var sigDropzoneContent = document.getElementById('pdfSigDropzoneContent');
    var isDragging = false;
    var isResizing = false;
    var dragStartX, dragStartY, dragOrigLeft, dragOrigTop;
    var resizeStartX, resizeStartY, resizeOrigW, resizeOrigH;

    signLoadPdf = loadAndRenderPdf;
    function loadAndRenderPdf(file) {
      var reader = new FileReader();
      reader.onload = async function(e) {
        try {
          var pdfjsLib = await import('/js/vendor/pdf.min.mjs');
          pdfjsLib.GlobalWorkerOptions.workerSrc = '/js/vendor/pdf.worker.min.mjs';

          var arrayBuffer = e.target.result;
          pdfDocPdfJs = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
          totalPages = pdfDocPdfJs.numPages;
          currentPageNum = 1;
          await renderPage(currentPageNum);

          var dropzone = document.getElementById('pdfDropzone');
          if (dropzone) dropzone.style.display = 'none';
          previewArea.style.display = 'block';
          clearMessages();
        } catch (err) {
          setPdfError('Failed to load PDF: ' + err.message);
        }
      };
      reader.readAsArrayBuffer(file);
    }

    async function renderPage(pageNum) {
      if (!pdfDocPdfJs) return;
      try {
        var pg = await pdfDocPdfJs.getPage(pageNum);
        var baseVp = pg.getViewport({ scale: 1 });

        var containerWidth = Math.min(previewContainer.clientWidth || 800, 800);
        var scale = containerWidth / baseVp.width;
        var viewport = pg.getViewport({ scale: scale });

        pdfPageWidth = baseVp.width;
        pdfPageHeight = baseVp.height;
        canvasWidth = Math.round(viewport.width);
        canvasHeight = Math.round(viewport.height);
        canvas.width = canvasWidth;
        canvas.height = canvasHeight;
        canvas.style.width = canvasWidth + 'px';
        canvas.style.height = canvasHeight + 'px';

        var ctx = canvas.getContext('2d');
        await pg.render({ canvasContext: ctx, viewport: viewport }).promise;

        if (pageIndicator) {
          pageIndicator.textContent = 'Page ' + pageNum + ' of ' + totalPages;
        }
        if (prevBtn) prevBtn.disabled = pageNum <= 1;
        if (nextBtn) nextBtn.disabled = pageNum >= totalPages;
        if (prevBtn) prevBtn.style.display = totalPages > 1 ? '' : 'none';
        if (nextBtn) nextBtn.style.display = totalPages > 1 ? '' : 'none';
        if (pageIndicator) pageIndicator.style.display = totalPages > 1 ? '' : 'none';

        if (overlayImg) {
          overlayImg.style.display = sigDataUrl ? 'block' : 'none';
        }
      } catch (err) {
        setPdfError('Failed to render page: ' + err.message);
      }
    }

    function positionOverlayDefault() {
      var defaultW = Math.min(150, canvasWidth * 0.4);
      var aspect = sigNaturalWidth / sigNaturalHeight || 1;
      var defaultH = defaultW / aspect;
      overlayImg.style.width = Math.round(defaultW) + 'px';
      overlayImg.style.height = Math.round(defaultH) + 'px';
      overlayImg.style.left = (canvasWidth - defaultW - 20) + 'px';
      overlayImg.style.top = (canvasHeight - defaultH - 20) + 'px';
    }

    function loadSignature(file) {
      var MAX_BYTES = 50 * 1024 * 1024;
      if (file.size > MAX_BYTES) {
        setPdfError('Signature image too large. Maximum size is 50 MB.');
        return;
      }
      sigMimeType = file.type;
      var reader = new FileReader();
      reader.onload = function(e) {
        sigArrayBuffer = e.target.result;

        var blob = new Blob([sigArrayBuffer], { type: sigMimeType });
        sigDataUrl = URL.createObjectURL(blob);

        var img = new Image();
        img.onload = function() {
          sigNaturalWidth = img.naturalWidth;
          sigNaturalHeight = img.naturalHeight;

          overlayImg.src = sigDataUrl;
          if (canvasWidth > 0) {
            overlayImg.style.display = 'block';
            positionOverlayDefault();
          }

          if (sigDropzoneContent) {
            sigDropzoneContent.innerHTML = ''
              + '<img src="' + sigDataUrl + '" style="max-height:120px;max-width:100%;border-radius:4px;display:block;margin:0 auto">'
              + '<p style="font-size:.8rem;margin-top:.25rem">' + file.name + ' — click to change</p>';
          }

          clearMessages();
        };
        img.onerror = function() {
          URL.revokeObjectURL(sigDataUrl);
          setPdfError('Failed to decode signature image.');
        };
        img.src = sigDataUrl;
      };
      reader.readAsArrayBuffer(file);
    }

    function initDrag(e) {
      if (isResizing) return;
      isDragging = true;
      var pos = getEventPos(e);
      dragStartX = pos.x;
      dragStartY = pos.y;
      dragOrigLeft = parseInt(overlayImg.style.left) || 0;
      dragOrigTop = parseInt(overlayImg.style.top) || 0;
      e.preventDefault();
    }

    function doDrag(e) {
      if (!isDragging) return;
      var pos = getEventPos(e);
      var dx = pos.x - dragStartX;
      var dy = pos.y - dragStartY;
      var newLeft = Math.max(0, Math.min(canvasWidth - overlayImg.offsetWidth, dragOrigLeft + dx));
      var newTop = Math.max(0, Math.min(canvasHeight - overlayImg.offsetHeight, dragOrigTop + dy));
      overlayImg.style.left = newLeft + 'px';
      overlayImg.style.top = newTop + 'px';
      e.preventDefault();
    }

    function stopDrag() {
      isDragging = false;
    }

    function initResize(e) {
      isResizing = true;
      var pos = getEventPos(e);
      resizeStartX = pos.x;
      resizeStartY = pos.y;
      resizeOrigW = overlayImg.offsetWidth;
      resizeOrigH = overlayImg.offsetHeight;
      e.preventDefault();
      e.stopPropagation();
    }

    function doResize(e) {
      if (!isResizing) return;
      var pos = getEventPos(e);
      var dx = pos.x - resizeStartX;
      var dy = pos.y - resizeStartY;
      var aspect = sigNaturalWidth / sigNaturalHeight || 1;
      var newW = Math.max(40, Math.min(canvasWidth * 0.8, resizeOrigW + dx));
      var newH = newW / aspect;
      if (newH > canvasHeight * 0.8) {
        newH = canvasHeight * 0.8;
        newW = newH * aspect;
      }
      overlayImg.style.width = Math.round(newW) + 'px';
      overlayImg.style.height = Math.round(newH) + 'px';
      var left = parseInt(overlayImg.style.left) || 0;
      var top = parseInt(overlayImg.style.top) || 0;
      if (left + newW > canvasWidth) {
        overlayImg.style.left = Math.max(0, canvasWidth - newW) + 'px';
      }
      if (top + newH > canvasHeight) {
        overlayImg.style.top = Math.max(0, canvasHeight - newH) + 'px';
      }
      e.preventDefault();
    }

    function stopResize() {
      isResizing = false;
    }

    function getEventPos(e) {
      if (e.touches) {
        return { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }
      return { x: e.clientX, y: e.clientY };
    }

    if (overlayImg) {
      overlayImg.addEventListener('mousedown', initDrag);
      overlayImg.addEventListener('touchstart', initDrag, { passive: false });

      document.addEventListener('mousemove', doDrag);
      document.addEventListener('mouseup', stopDrag);
      document.addEventListener('touchmove', doDrag, { passive: false });
      document.addEventListener('touchend', stopDrag);

      var resizeHandle = document.createElement('div');
      resizeHandle.style.cssText = 'position:absolute;bottom:0;right:0;width:16px;height:16px;cursor:nwse-resize;background:rgba(0,0,0,.2);border-radius:0 0 4px 0';
      resizeHandle.title = 'Resize';
      overlayImg.parentNode.appendChild(resizeHandle);

      resizeHandle.addEventListener('mousedown', initResize);
      resizeHandle.addEventListener('touchstart', initResize, { passive: false });
      document.addEventListener('mousemove', doResize);
      document.addEventListener('mouseup', stopResize);
      document.addEventListener('touchmove', doResize, { passive: false });
      document.addEventListener('touchend', stopResize);
    }

    if (sigDropzone && sigInput) {
      sigDropzone.addEventListener('click', function() { sigInput.click(); });
      sigDropzone.addEventListener('dragover', function(e) { e.preventDefault(); sigDropzone.classList.add('drag-over'); });
      sigDropzone.addEventListener('dragleave', function() { sigDropzone.classList.remove('drag-over'); });
      sigDropzone.addEventListener('drop', function(e) {
        e.preventDefault();
        sigDropzone.classList.remove('drag-over');
        if (e.dataTransfer.files.length) {
          loadSignature(e.dataTransfer.files[0]);
        }
      });
      sigInput.addEventListener('change', function(e) {
        if (e.target.files.length) {
          loadSignature(e.target.files[0]);
        }
        sigInput.value = '';
      });
    }

    if (prevBtn) {
      prevBtn.addEventListener('click', function() {
        if (currentPageNum > 1) {
          currentPageNum--;
          renderPage(currentPageNum);
        }
      });
    }
    if (nextBtn) {
      nextBtn.addEventListener('click', function() {
        if (currentPageNum < totalPages) {
          currentPageNum++;
          renderPage(currentPageNum);
        }
      });
    }
    if (changePdfBtn) {
      changePdfBtn.addEventListener('click', function() {
        var dropzone = document.getElementById('pdfDropzone');
        if (dropzone) dropzone.style.display = '';
        previewArea.style.display = 'none';
        selectedPdfFile = null;
        pdfDocPdfJs = null;
        sigArrayBuffer = null;
        sigDataUrl = null;
        overlayImg.style.display = 'none';
        if (sigDropzoneContent) {
          sigDropzoneContent.innerHTML = ''
            + '<span class="img-dropzone-icon">✍️</span>'
            + '<p><strong>Drop signature image here</strong> or click to browse</p>'
            + '<p class="img-dropzone-hint">Supports: PNG, JPG, WebP</p>';
        }
        var infoEl = document.getElementById('pdfFileInfo');
        if (infoEl) infoEl.textContent = '';
      });
    }

    signExecute = executeClientSideSign;
    function executeClientSideSign() {
      if (!selectedPdfFile) {
        setPdfError('Please select a PDF file first.');
        return;
      }
      if (!sigArrayBuffer) {
        setPdfError('Please select a signature image.');
        return;
      }

      var originalBtnText = actionBtn.textContent;
      actionBtn.disabled = true;
      actionBtn.innerHTML = '<span class="spinner spinner-dark"></span> Processing\u2026';

      var reader = new FileReader();
      reader.onerror = function() {
        setPdfError('Failed to read PDF file.');
        actionBtn.disabled = false;
        actionBtn.textContent = originalBtnText;
      };
      reader.onload = async function(e) {
        try {
          var pdfArrayBuffer = e.target.result;
          var pdfDoc = await window.PDFLib.PDFDocument.load(pdfArrayBuffer);

          var pages = pdfDoc.getPages();
          if (currentPageNum < 1 || currentPageNum > pages.length) {
            throw new Error('Invalid page number.');
          }
          var pg = pages[currentPageNum - 1];
          var pgSize = pg.getSize();

          var scaleX = pgSize.width / canvasWidth;
          var scaleY = pgSize.height / canvasHeight;

          var overlayLeft = parseInt(overlayImg.style.left) || 0;
          var overlayTop = parseInt(overlayImg.style.top) || 0;
          var overlayW = overlayImg.offsetWidth;
          var overlayH = overlayImg.offsetHeight;

          var pdfX = overlayLeft * scaleX;
          var pdfY = (canvasHeight - overlayTop - overlayH) * scaleY;
          var pdfSigW = overlayW * scaleX;
          var pdfSigH = overlayH * scaleY;

          var sigImage;
          if (sigMimeType === 'image/png') {
            sigImage = await pdfDoc.embedPng(sigArrayBuffer);
          } else if (sigMimeType === 'image/jpeg' || sigMimeType === 'image/jpg') {
            sigImage = await pdfDoc.embedJpg(sigArrayBuffer);
          } else if (sigMimeType === 'image/webp') {
            sigImage = await embedWebpAsPng(pdfDoc, sigArrayBuffer);
          } else {
            sigImage = await pdfDoc.embedPng(sigArrayBuffer);
          }

          pg.drawImage(sigImage, {
            x: pdfX,
            y: pdfY,
            width: pdfSigW,
            height: pdfSigH
          });

          var pdfBytes = await pdfDoc.save();
          var blob = new Blob([pdfBytes], { type: 'application/pdf' });
          setPdfSuccess('PDF signed successfully!');
          downloadBlob(blob, 'signed.pdf');
        } catch (err) {
          setPdfError('Error signing PDF: ' + err.message);
        } finally {
          actionBtn.disabled = false;
          actionBtn.textContent = originalBtnText;
        }
      };
      reader.readAsArrayBuffer(selectedPdfFile);
    }

    async function embedWebpAsPng(pdfDoc, arrayBuffer) {
      var blob = new Blob([arrayBuffer], { type: 'image/webp' });
      var url = URL.createObjectURL(blob);
      return new Promise(function(resolve, reject) {
        var img = new Image();
        img.onload = function() {
          var c = document.createElement('canvas');
          c.width = img.naturalWidth;
          c.height = img.naturalHeight;
          var ctx = c.getContext('2d');
          ctx.drawImage(img, 0, 0);
          c.toBlob(function(pngBlob) {
            URL.revokeObjectURL(url);
            pngBlob.arrayBuffer().then(function(buf) {
              pdfDoc.embedPng(buf).then(resolve).catch(reject);
            }).catch(reject);
          }, 'image/png');
        };
        img.onerror = function() {
          URL.revokeObjectURL(url);
          reject(new Error('Failed to decode WebP image.'));
        };
        img.src = url;
      });
    }
  }

  function fetchFormFields(file) {
    clearMessages();
    var formArea = document.getElementById('pdfFormFieldsArea');
    if (formArea) {
      formArea.innerHTML = '<div style="padding:1rem;text-align:center;color:var(--text-muted)"><span class="spinner"></span> Analyzing form fields\u2026</div>';
    }

    var fd = new FormData();
    fd.append('file', file);

    fetch('/api/pdf/form-fields', {
      method: 'POST',
      body: fd
    }).then(function(response) {
      if (!response.ok) {
        return response.text().then(function(text) {
          var errMsg = 'Failed to analyze form fields (' + response.status + ')';
          try { var j = JSON.parse(text); if (j.error) errMsg = j.error; } catch(_) { if (text) errMsg = text; }
          throw new Error(errMsg);
        });
      }
      return response.json();
    }).then(function(data) {
      formFieldsData = data.fields || [];
      if (formFieldsData.length === 0) {
        if (formArea) formArea.innerHTML = '';
        setPdfInfo('The PDF does not contain fillable form fields.');
        return;
      }
      renderFormFields(formArea);
    }).catch(function(err) {
      setPdfError(friendlyFetchError(err));
      if (formArea) formArea.innerHTML = '';
    });
  }

  function renderFormFields(container) {
    if (!container) container = document.getElementById('pdfFormFieldsArea');
    if (!container) return;

    var html = '';
    formInitialValues = {};

    formFieldsData.forEach(function(field) {
      var label = field.name;
      var dotIdx = label.lastIndexOf('.');
      if (dotIdx !== -1) label = label.substring(dotIdx + 1);
      label = label.replace(/\s*\[.*?\]\s*$/, '');
      if (!label) label = field.name;

      var fieldId = 'pdf_field_' + field.name.replace(/[^a-zA-Z0-9_]/g, '_');
      formInitialValues[field.name] = field.value;

      html += '<div class="pdf-form-field" style="margin-bottom:.75rem">';
      html += '<label for="' + fieldId + '" style="display:block;font-size:.85rem;margin-bottom:.25rem;font-weight:600">' + escapeHtml(label) + '</label>';

      switch (field.type) {
        case 'text':
          var val = field.value != null ? field.value : '';
          html += '<input type="text" id="' + fieldId + '" value="' + escapeHtml(val) + '" style="width:100%;padding:.5rem;border:1px solid var(--border);border-radius:4px;background:var(--bg-card);box-sizing:border-box">';
          break;
        case 'checkbox':
          var checked = field.value != null && field.value !== '/Off';
          html += '<input type="checkbox" id="' + fieldId + '"' + (checked ? ' checked' : '') + ' style="transform:scale(1.2);margin:.25rem 0">';
          break;
        case 'radio':
        case 'choice':
          var options = field.states || [];
          html += '<select id="' + fieldId + '" style="width:100%;padding:.5rem;border:1px solid var(--border);border-radius:4px;background:var(--bg-card)">';
          options.forEach(function(opt) {
            var selected = opt === field.value ? ' selected' : '';
            html += '<option value="' + escapeHtml(opt) + '"' + selected + '>' + escapeHtml(opt) + '</option>';
          });
          html += '</select>';
          break;
      }

      html += '</div>';
    });

    container.innerHTML = html;
  }

  function executeFormFill() {
    if (!selectedPdfFile) {
      setPdfError('Please select a PDF file first.');
      return;
    }

    if (!formFieldsData) {
      setPdfError('Form fields are still loading. Please wait.');
      return;
    }

    var fieldsObj = {};
    var hasChanges = false;

    formFieldsData.forEach(function(field) {
      var fieldId = 'pdf_field_' + field.name.replace(/[^a-zA-Z0-9_]/g, '_');
      var el = document.getElementById(fieldId);
      if (!el) return;

      var initialVal = formInitialValues[field.name];
      var currentVal;

      switch (field.type) {
        case 'text':
          currentVal = el.value;
          if (currentVal !== '') {
            fieldsObj[field.name] = currentVal;
            hasChanges = true;
          }
          break;
        case 'checkbox':
          currentVal = el.checked;
          var initChecked = initialVal != null && initialVal !== '/Off';
          if (currentVal !== initChecked) {
            fieldsObj[field.name] = currentVal;
            hasChanges = true;
          }
          break;
        case 'radio':
        case 'choice':
          currentVal = el.value;
          if (currentVal !== initialVal) {
            fieldsObj[field.name] = currentVal;
            hasChanges = true;
          }
          break;
      }
    });

    if (!hasChanges) {
      setPdfError('No fields have been modified. Please make changes before filling.');
      return;
    }

    var originalBtnText = actionBtn.textContent;
    actionBtn.disabled = true;
    actionBtn.innerHTML = '<span class="spinner spinner-dark"></span> Processing\u2026';

    var fd = new FormData();
    fd.append('file', selectedPdfFile);
    fd.append('fields', JSON.stringify(fieldsObj));

    fetch('/api/pdf/form-fill', {
      method: 'POST',
      body: fd
    }).then(function(response) {
      if (!response.ok) {
        return response.text().then(function(text) {
          var errMsg = 'Request failed (' + response.status + ')';
          try { var j = JSON.parse(text); if (j.error) errMsg = j.error; } catch(_) { if (text) errMsg = text; }
          throw new Error(errMsg);
        });
      }

      var contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        return response.json().then(function(json) {
          if (json.error) throw new Error(json.error);
          throw new Error('Unexpected JSON response from server.');
        });
      }

      return response.blob().then(function(blob) {
        setPdfSuccess('Form filled successfully!');
        downloadBlob(blob, 'filled.pdf');
      });
    }).catch(function(err) {
      setPdfError(friendlyFetchError(err));
    }).finally(function() {
      actionBtn.disabled = false;
      actionBtn.textContent = originalBtnText;
    });
  }

  actionBtn.addEventListener('click', executeAction);

  function executeAction() {
    clearMessages();

    if (sub === 'form') {
      executeFormFill();
      return;
    }

    if (sub === 'sign') {
      if (signExecute) signExecute();
      return;
    }

    if (sub === 'merge') {
      if (mergeFiles.length < 2) {
        setPdfError('Please select at least 2 PDF files to merge.');
        return;
      }
    } else {
      if (!selectedPdfFile) {
        setPdfError('Please select a PDF file first.');
        return;
      }
    }

    if ((sub === 'extract' || sub === 'delete') && !document.getElementById('pdfPages')?.value.trim()) {
      setPdfError('Please enter page numbers.');
      return;
    }

    var originalBtnText = actionBtn.textContent;
    actionBtn.disabled = true;
    actionBtn.innerHTML = '<span class="spinner spinner-dark"></span> Processing\u2026';

    var formData = new FormData();
    var originalSize = 0;

    if (sub === 'merge') {
      mergeFiles.forEach(function(f) { formData.append('file', f); });
    } else {
      formData.append('file', selectedPdfFile);
      originalSize = selectedPdfFile.size;
    }

    if (sub === 'extract' || sub === 'delete') {
      formData.append('pages', document.getElementById('pdfPages').value.trim());
    }

    if (sub === 'rotate') {
      formData.append('angle', document.getElementById('pdfAngle')?.value || '90');
      var pagesVal = document.getElementById('pdfPages')?.value.trim();
      if (pagesVal) formData.append('pages', pagesVal);
    }

    var endpoint = '/api/pdf/' + sub;

    fetch(endpoint, {
      method: 'POST',
      body: formData
    }).then(function(response) {
      if (!response.ok) {
        return response.text().then(function(text) {
          var errMsg = 'Request failed (' + response.status + ')';
          try {
            var json = JSON.parse(text);
            if (json.error) errMsg = json.error;
          } catch (_) {
            if (text) errMsg = text;
          }
          throw new Error(errMsg);
        });
      }

      var contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        return response.json().then(function(json) {
          if (json.error) throw new Error(json.error);
          throw new Error('Unexpected JSON response from server.');
        });
      }

      return response.blob().then(function(blob) {
        var filename = getOutputFilename(sub);
        var sizeKB = (blob.size / 1024).toFixed(1);
        var sizeMB = (blob.size / 1024 / 1024).toFixed(2);
        var sizeStr = sizeKB < 1024 ? sizeKB + ' KB' : sizeMB + ' MB';
        var successMsg = 'File ready! Size: ' + sizeStr;

        if (sub === 'compress' && originalSize > 0) {
          var saved = ((originalSize - blob.size) / originalSize * 100).toFixed(1);
          var origStr = (originalSize / 1024 / 1024).toFixed(2) + ' MB';
          successMsg = 'Compressed from ' + origStr + ' to ' + sizeMB + ' MB (saved ' + saved + '%)';
        }

        setPdfSuccess(successMsg);
        downloadBlob(blob, filename);
      });
    }).catch(function(err) {
      setPdfError(friendlyFetchError(err));
    }).finally(function() {
      actionBtn.disabled = false;
      actionBtn.textContent = originalBtnText;
    });
  }
}

function getOutputFilename(sub) {
  var names = {
    merge: 'merged.pdf',
    split: 'split_pages.zip',
    extract: 'extracted_pages.pdf',
    delete: 'pages_removed.pdf',
    rotate: 'rotated.pdf',
    compress: 'compressed.pdf',
    sign: 'signed.pdf',
    form: 'filled.pdf'
  };
  return names[sub] || 'output.pdf';
}

function downloadBlob(blob, filename) {
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function setPdfError(msg) {
  var el = document.getElementById('pdfMsgError');
  if (el) { el.textContent = '\u274C ' + msg; el.style.display = 'flex'; }
}

function setPdfSuccess(msg) {
  var el = document.getElementById('pdfMsgSuccess');
  if (el) { el.textContent = '\u2705 ' + msg; el.style.display = 'flex'; }
}

function setPdfInfo(msg) {
  var el = document.getElementById('pdfMsgInfo');
  if (el) { el.textContent = '\u2139\uFE0F ' + msg; el.style.display = 'flex'; }
}

function escapeHtml(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function friendlyFetchError(err) {
  if (err instanceof TypeError || /failed to fetch|networkerror/i.test(err.message)) {
    return 'Cannot reach the ione server. Is it still running? Restart it with the "ione" command (default port 8311) and reload this page from the right URL.';
  }
  return err.message;
}

window.renderPdfPage = renderPdfPage;

})();
