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
        + '</div>';
      controlsHtml = '<div class="pdf-controls" style="margin-bottom:.75rem">'
        + '<div class="img-dropzone" id="pdfSigDropzone" style="margin-bottom:.75rem">'
        + '<div class="img-dropzone-content">'
        + '<span class="img-dropzone-icon">✍️</span>'
        + '<p><strong>Drop signature image here</strong> or click to browse</p>'
        + '<p class="img-dropzone-hint">Supports: PNG, JPG, WebP</p>'
        + '</div>'
        + '<input type="file" id="pdfSigInput" accept=".png,.jpg,.jpeg,.webp" style="display:none">'
        + '</div>'
        + '<div style="display:flex;gap:.75rem;flex-wrap:wrap;align-items:center;margin-bottom:.5rem">'
        + '<label style="font-size:.85rem">Page: <input type="number" id="pdfSignPage" value="1" min="1" style="width:70px;padding:.4rem;border:1px solid var(--border);border-radius:4px;background:var(--bg-card)"></label>'
        + '<label style="font-size:.85rem">Position: <select id="pdfSignPosition" style="padding:.4rem;border:1px solid var(--border);border-radius:4px;background:var(--bg-card)">'
        + '<option value="tl">Top Left</option><option value="tc">Top Center</option><option value="tr">Top Right</option>'
        + '<option value="l">Left</option><option value="c">Center</option><option value="r">Right</option>'
        + '<option value="bl">Bottom Left</option><option value="bc">Bottom Center</option><option value="br" selected>Bottom Right</option>'
        + '</select></label>'
        + '</div>'
        + '<label style="font-size:.85rem">Scale: <span id="pdfSignScaleVal">0.20</span>'
        + '<input type="range" id="pdfSignScale" min="0" max="1" step="0.05" value="0.2" style="width:100%;display:block"></label>'
        + '</div>';
      actionLabel = '✍️ Sign PDF';
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
  var sigFile = null;
  var formFieldsData = null;
  var formInitialValues = {};

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
    var sigDropzone = document.getElementById('pdfSigDropzone');
    var sigInput = document.getElementById('pdfSigInput');

    if (sigDropzone && sigInput) {
      sigDropzone.addEventListener('click', function() { sigInput.click(); });
      sigDropzone.addEventListener('dragover', function(e) { e.preventDefault(); sigDropzone.classList.add('drag-over'); });
      sigDropzone.addEventListener('dragleave', function() { sigDropzone.classList.remove('drag-over'); });
      sigDropzone.addEventListener('drop', function(e) {
        e.preventDefault();
        sigDropzone.classList.remove('drag-over');
        if (e.dataTransfer.files.length) {
          sigFile = e.dataTransfer.files[0];
          updateSigInfo(sigFile);
        }
      });
      sigInput.addEventListener('change', function(e) {
        if (e.target.files.length) {
          sigFile = e.target.files[0];
          updateSigInfo(sigFile);
        }
        sigInput.value = '';
      });
    }

    var scaleInput = document.getElementById('pdfSignScale');
    if (scaleInput) {
      scaleInput.addEventListener('input', function() {
        var valEl = document.getElementById('pdfSignScaleVal');
        if (valEl) valEl.textContent = parseFloat(this.value).toFixed(2);
      });
    }
  }

  function updateSigInfo(file) {
    var MAX_BYTES = 50 * 1024 * 1024;
    if (file.size > MAX_BYTES) {
      setPdfError('Signature image too large. Maximum size is 50 MB.');
      sigFile = null;
      return;
    }
    var infoEl = document.getElementById('pdfFileInfo');
    if (infoEl) infoEl.textContent = '\u270D\uFE0F Signature: ' + file.name + ' (' + (file.size / 1024).toFixed(1) + ' KB)';
    clearMessages();
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

    if (sub === 'sign' && !sigFile) {
      setPdfError('Please select a signature image.');
      return;
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
    } else if (sub === 'sign') {
      formData.append('file', selectedPdfFile);
      formData.append('signature', sigFile);
      var page = document.getElementById('pdfSignPage')?.value || '1';
      var position = document.getElementById('pdfSignPosition')?.value || 'br';
      var scale = document.getElementById('pdfSignScale')?.value || '0.2';
      formData.append('page', page);
      formData.append('position', position);
      formData.append('scale', scale);
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
