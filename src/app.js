let products = [];
let editingId = null;
let selectedImagePath = null;

const tbody = document.getElementById('productsBody');
const searchInput = document.getElementById('searchInput');
const modalOverlay = document.getElementById('modalOverlay');
const modalTitle = document.getElementById('modalTitle');
const editCode = document.getElementById('editCode');
const editName = document.getElementById('editName');
const editUnidad = document.getElementById('editUnidad');
const editFamilia = document.getElementById('editFamilia');
const editQuantity = document.getElementById('editQuantity');
const editMinima = document.getElementById('editMinima');
const imagePreview = document.getElementById('imagePreview');
const imagePlaceholder = document.getElementById('imagePlaceholder');
const imageUploadArea = document.getElementById('imageUploadArea');
const imgTooltip = document.getElementById('imgTooltip');
const tooltipImage = document.getElementById('tooltipImage');

let tooltipHideTimeout = null;

async function loadProducts() {
  products = await window.electronAPI.getProducts();
  renderTable();
}

function renderTable() {
  const search = searchInput.value.toLowerCase();
  const filtered = products.filter(p =>
    p.code.toLowerCase().includes(search) ||
    p.name.toLowerCase().includes(search)
  );

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="9" class="px-6 py-12 text-center text-gray-500">
          <div>${products.length === 0 ? 'No hay artículos registrados' : 'Sin resultados'}</div>
          <div class="text-xs text-gray-600 mt-1">${products.length === 0 ? 'Haz clic en "Agregar Producto" para comenzar' : 'Prueba con otros términos'}</div>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = filtered.map((p, i) => {
    const stockOk = p.quantity > p.minima;
    const requestText = stockOk ? 'SUFICIENTE' : 'SOLICITAR';
    return `
    <tr data-id="${p.id}">
      <td class="w-12 text-center align-middle"><span class="row-number">${i + 1}</span></td>
      <td class="align-middle"><span class="cell-text text-gray-300" data-field="code">${escapeHtml(p.code)}</span></td>
      <td class="name-cell align-middle">
        <span class="cell-text text-gray-100 font-medium name-text" data-field="name" data-image="${escapeHtml(p.image_path || '')}">${escapeHtml(p.name)}</span>
        <div class="flex gap-1 mt-1">
          <button class="btn-action" onclick="subtractProduct(${p.id}, this)" title="Restar stock">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/></svg>
          </button>
          ${p.image_path ? `<button class="btn-action" onclick="uploadImage(${p.id})" title="Cambiar imagen">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
          </button>` : ''}
        </div>
      </td>
      <td class="align-middle"><span class="cell-text text-gray-300" data-field="unidad">${cleanText(p.unidad)}</span></td>
      <td class="align-middle"><span class="cell-text text-gray-300" data-field="familia">${cleanText(p.familia)}</span></td>
      <td class="w-20 text-center align-middle"><span class="cell-text text-gray-300 font-medium" data-field="minima">${p.minima}</span></td>
      <td class="w-20 text-center align-middle"><span class="cell-text ${p.quantity >= 0 ? 'stock-ok' : 'stock-low'}" data-field="quantity">${p.quantity}</span></td>
      <td class="w-32 text-center align-middle no-truncate">
        <span class="${stockOk ? 'request-ok' : 'request-low'}">${requestText}</span>
      </td>
      <td class="w-16 text-center align-middle">
        <div class="actions-cell">
          <button class="btn-action edit" onclick="openEditModal(${p.id})" title="Editar">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button class="btn-action" onclick="deleteProduct(${p.id})" title="Eliminar">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
          </button>
        </div>
      </td>
    </tr>
    `;
  }).join('');

  resolveImages();
}

async function resolveImages() {
  const imgs = document.querySelectorAll('.name-text[data-image]');
  for (const el of imgs) {
    const relPath = el.dataset.image;
    if (relPath) {
      const fullPath = await window.electronAPI.resolveImagePath(relPath);
      el.dataset.fullpath = fullPath;
    }
  }
}

function getProductFromRow(tr) {
  const id = parseInt(tr.dataset.id);
  return products.find(p => p.id === id);
}

// Single click to edit with auto-save
let currentEditingInput = null;

function cancelEditing(input) {
  if (!input) return;
  const span = document.createElement('span');
  const field = input.dataset.field;
  const originalValue = input.dataset.original;
  const productId = parseInt(input.dataset.productId);
  const product = products.find(p => p.id === productId);
  if (!product) { input.replaceWith(document.createElement('span')); return; }
  span.className = `cell-text ${field === 'name' ? 'text-gray-100 font-medium name-text' : 'text-gray-300'}`;
  span.dataset.field = field;
  if (field === 'name') span.dataset.image = product.image_path || '';
  span.textContent = originalValue;
  input.replaceWith(span);
  if (currentEditingInput === input) currentEditingInput = null;
}

function finishEditing(input) {
  if (!input) return;
  const field = input.dataset.field;
  const originalValue = input.dataset.original;
  const productId = parseInt(input.dataset.productId);
  const product = products.find(p => p.id === productId);
  if (!product) { cancelEditing(input); return; }

  const isNumber = field === 'quantity' || field === 'minima';
  const newValue = isNumber ? (parseInt(input.value) || 0) : input.value;

  if (String(newValue) === String(originalValue)) {
    const span = document.createElement('span');
    span.className = `cell-text ${field === 'name' ? 'text-gray-100 font-medium name-text' : 'text-gray-300'}`;
    span.dataset.field = field;
    if (field === 'name') span.dataset.image = product.image_path || '';
    span.textContent = originalValue;
    input.replaceWith(span);
    if (currentEditingInput === input) currentEditingInput = null;
    return;
  }

  const updated = { ...product, [field]: newValue };
  window.electronAPI.updateProduct(updated).then(() => {
    product[field] = newValue;
    const span = document.createElement('span');
    span.className = `cell-text ${field === 'name' ? 'text-gray-100 font-medium name-text' : 'text-gray-300'}`;
    span.dataset.field = field;
    if (field === 'name') span.dataset.image = product.image_path || '';
    span.textContent = newValue;
    input.replaceWith(span);
    if (currentEditingInput === input) currentEditingInput = null;
    renderTable();
  }).catch(() => {
    showToast('Error al actualizar', true);
    cancelEditing(input);
  });
}

function startEditing(span) {
  if (currentEditingInput) {
    finishEditing(currentEditingInput);
  }

  const field = span.dataset.field;
  const tr = span.closest('tr');
  const product = getProductFromRow(tr);
  if (!product) return;

  const currentValue = product[field];
  const isNumber = field === 'quantity' || field === 'minima';

  const input = document.createElement('input');
  input.type = isNumber ? 'number' : 'text';
  input.value = currentValue;
  input.className = 'cell-editing';
  input.dataset.field = field;
  input.dataset.original = currentValue;
  input.dataset.productId = product.id;
  if (isNumber) { input.min = 0; input.style.width = '80px'; }

  span.replaceWith(input);
  input.focus();
  input.select();
  currentEditingInput = input;

  input.addEventListener('blur', () => finishEditing(input));
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); input.blur(); }
    if (e.key === 'Escape') { cancelEditing(input); }
  });
}

tbody.addEventListener('click', (e) => {
  const span = e.target.closest('.cell-text[data-field]');
  if (!span) return;
  if (e.target.closest('.btn-action')) return;
  startEditing(span);
});

tbody.addEventListener('mouseenter', (e) => {
  const span = e.target.closest('.name-text[data-image]');
  if (!span || !span.dataset.image) return;
  clearTimeout(tooltipHideTimeout);
  showTooltip(span, span.dataset.image);
}, true);

tbody.addEventListener('mousemove', (e) => {
  const span = e.target.closest('.name-text[data-image]');
  if (!span || !span.dataset.image || imgTooltip.classList.contains('hidden')) return;
  positionTooltip(e.target);
});

tbody.addEventListener('mouseleave', (e) => {
  const span = e.target.closest('.name-text');
  if (!span) { hideTooltip(); return; }
  const related = e.relatedTarget;
  if (related && span.contains(related)) return;
  hideTooltip();
}, true);

async function showTooltip(span, imagePath) {
  if (imagePath) {
    const fullPath = span.dataset.fullpath || await window.electronAPI.resolveImagePath(imagePath);
    span.dataset.fullpath = fullPath;
    tooltipImage.src = `file:///${fullPath}`;
    imgTooltip.classList.remove('hidden');
    positionTooltip(span);
  }
}

function positionTooltip(el) {
  const rect = el.getBoundingClientRect();
  let left = rect.right + 8;
  let top = rect.top - 10;
  if (left + 210 > window.innerWidth) left = rect.left - 210;
  if (top < 0) top = rect.bottom + 10;
  imgTooltip.style.left = left + 'px';
  imgTooltip.style.top = top + 'px';
}

function hideTooltip() {
  clearTimeout(tooltipHideTimeout);
  tooltipHideTimeout = setTimeout(() => {
    imgTooltip.classList.add('hidden');
  }, 200);
}

function openEditModal(id) {
  const product = products.find(p => p.id === id);
  if (product) openModal(product);
}

async function uploadImage(id) {
  const result = await window.electronAPI.selectImage();
  if (!result) return;
  const relativePath = await window.electronAPI.copyImageToApp(result);
  const product = products.find(p => p.id === id);
  if (!product) return;
  const updated = { ...product, image_path: relativePath };
  try {
    await window.electronAPI.updateProduct(updated);
    product.image_path = relativePath;
    renderTable();
    showToast('Imagen actualizada');
  } catch {
    showToast('Error al actualizar imagen', true);
  }
}

async function subtractProduct(id, btn) {
  const tr = btn.closest('tr');
  const product = getProductFromRow(tr);
  if (!product) return;

  const qtyInput = document.createElement('input');
  qtyInput.type = 'number';
  qtyInput.min = 0;
  qtyInput.value = '';
  qtyInput.placeholder = '0';
  qtyInput.className = 'subtract-input';
  qtyInput.style.width = '60px';

  const confirmBtn = document.createElement('button');
  confirmBtn.textContent = 'Restar';
  confirmBtn.className = 'px-2 py-1 bg-red-600 hover:bg-red-500 text-white text-xs font-medium rounded transition-colors';

  const parent = btn.parentElement;
  const origHTML = parent.innerHTML;
  parent.innerHTML = '';
  parent.appendChild(qtyInput);
  parent.appendChild(confirmBtn);
  qtyInput.focus();

  const doSubtract = async () => {
    const qty = parseInt(qtyInput.value);
    if (!qty || qty <= 0) {
      showToast('Cantidad inválida', true);
      parent.innerHTML = origHTML;
      return;
    }
    if (qty > product.quantity) {
      showToast(`Stock insuficiente. Actual: ${product.quantity}`, true);
      parent.innerHTML = origHTML;
      return;
    }
    try {
      const result = await window.electronAPI.subtractQuantity(id, qty);
      product.quantity = result.quantity;
      renderTable();
      showToast(`Restados ${qty} uds. Stock: ${result.quantity}`);
    } catch {
      showToast('Error al restar', true);
      parent.innerHTML = origHTML;
    }
  };

  confirmBtn.addEventListener('click', doSubtract);
  qtyInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') doSubtract();
    if (e.key === 'Escape') parent.innerHTML = origHTML;
  });
}

async function deleteProduct(id) {
  try {
    await window.electronAPI.deleteProduct(id);
    products = products.filter(p => p.id !== id);
    renderTable();
    showToast('Producto eliminado');
  } catch {
    showToast('Error al eliminar', true);
  }
}

function openModal(product) {
  editingId = product ? product.id : null;
  modalTitle.textContent = product ? 'Editar Producto' : 'Nuevo Producto';
  editCode.value = product ? product.code : '';
  editName.value = product ? product.name : '';
  editUnidad.value = product ? (product.unidad || '') : '';
  editFamilia.value = product ? (product.familia || '') : '';
  editQuantity.value = product ? product.quantity : 0;
  editMinima.value = product ? (product.minima || 0) : 0;
  selectedImagePath = null;

  if (product && product.image_path) {
    window.electronAPI.resolveImagePath(product.image_path).then(fullPath => {
      imagePreview.src = `file:///${fullPath}`;
      imagePreview.classList.remove('hidden');
      imagePlaceholder.classList.add('hidden');
    });
  } else {
    imagePreview.classList.add('hidden');
    imagePlaceholder.classList.remove('hidden');
  }

  modalOverlay.classList.remove('hidden');
  editCode.focus();
}

function closeModal() {
  modalOverlay.classList.add('hidden');
  editingId = null;
  selectedImagePath = null;
}

imageUploadArea.addEventListener('click', async () => {
  const result = await window.electronAPI.selectImage();
  if (!result) return;
  selectedImagePath = result;
  imagePreview.src = `file:///${result}`;
  imagePreview.classList.remove('hidden');
  imagePlaceholder.classList.add('hidden');
});

document.getElementById('btnAddProduct').addEventListener('click', () => openModal(null));
document.getElementById('btnCloseModal').addEventListener('click', closeModal);
document.getElementById('btnCancelModal').addEventListener('click', closeModal);

document.getElementById('btnSaveProduct').addEventListener('click', async (e) => {
  const code = editCode.value.trim();
  const name = editName.value.trim();
  const unidad = editUnidad.value.trim();
  const familia = editFamilia.value.trim();
  const quantity = parseInt(editQuantity.value) || 0;
  const minima = parseInt(editMinima.value) || 0;

  if (!code || !name) {
    showToast('Código y nombre son obligatorios', true);
    return;
  }

  let imagePath = null;
  if (selectedImagePath) {
    try {
      imagePath = await window.electronAPI.copyImageToApp(selectedImagePath);
    } catch {
      showToast('Error al copiar imagen', true);
      return;
    }
  } else if (editingId) {
    const product = products.find(p => p.id === editingId);
    imagePath = product ? product.image_path : null;
  }

  try {
    if (editingId) {
      const product = products.find(p => p.id === editingId);
      if (!product) { showToast('Producto no encontrado', true); return; }
      const updated = { id: editingId, code, name, image_path: imagePath, quantity, unidad, familia, minima };
      await window.electronAPI.updateProduct(updated);
      Object.assign(product, updated);
      showToast('Producto actualizado');
    } else {
      const newProduct = await window.electronAPI.addProduct({ code, name, image_path: imagePath, quantity, unidad, familia, minima });
      products.push(newProduct);
      showToast('Producto agregado');
    }
    closeModal();
    renderTable();
  } catch (err) {
    const msg = err && err.message ? err.message : String(err);
    if (msg.includes('UNIQUE')) {
      showToast('El código ya existe', true);
    } else {
      showToast('Error al guardar: ' + msg, true);
    }
  }
});

document.getElementById('btnExportPdf').addEventListener('click', async () => {
  if (products.length === 0) {
    showToast('No hay productos para exportar', true);
    return;
  }
  try {
    showToast('Generando PDF...');
    const buffer = await window.electronAPI.generatePdf({ products });
    const saved = await window.electronAPI.saveFile(buffer, `inventario-${new Date().toISOString().slice(0, 10)}.pdf`);
    if (saved) showToast('PDF exportado correctamente');
  } catch (err) {
    showToast('Error al exportar PDF', true);
  }
});

searchInput.addEventListener('input', renderTable);

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function cleanText(val) {
  const t = (val || '').trim();
  return t === '--' ? '' : escapeHtml(t);
}

function showToast(message, isError = false) {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.style.background = isError ? '#dc2626' : '#1f2937';
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 2500);
}

const updateBanner = document.getElementById('updateBanner');
const updateMessage = document.getElementById('updateMessage');
const updateProgress = document.getElementById('updateProgress');
const progressFill = document.getElementById('progressFill');

window.electronAPI.onUpdateAvailable((info) => {
  updateMessage.textContent = `Nueva versión ${info.version} disponible`;
  updateBanner.classList.remove('hidden');
  showToast(`Actualización ${info.version} disponible`);
});

window.electronAPI.onUpdateNotAvailable(() => {
  showToast('Ya tienes la última versión');
});

window.electronAPI.onUpdateError((msg) => {
  showToast('Error al buscar actualización: ' + msg, true);
});

window.electronAPI.onUpdateProgress((p) => {
  updateBanner.classList.add('hidden');
  updateProgress.classList.remove('hidden');
  progressFill.style.width = Math.round(p.percent) + '%';
});

window.electronAPI.onUpdateDownloaded(() => {
  updateProgress.innerHTML = '<span class="text-green-400">Actualización descargada. Reiniciando...</span>';
  setTimeout(() => window.electronAPI.installUpdate(), 1500);
});

document.getElementById('btnDownloadUpdate').addEventListener('click', () => {
  window.electronAPI.downloadUpdate();
  updateBanner.classList.add('hidden');
  updateProgress.classList.remove('hidden');
  progressFill.style.width = '0%';
});

document.getElementById('btnDismissUpdate').addEventListener('click', () => {
  updateBanner.classList.add('hidden');
});

document.getElementById('btnCheckUpdates').addEventListener('click', async () => {
  try {
    await window.electronAPI.checkForUpdates();
    showToast('Buscando actualizaciones...');
  } catch {
    showToast('Error al buscar actualizaciones', true);
  }
});

loadProducts();
