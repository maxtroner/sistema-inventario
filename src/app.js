let products = [];
let editingId = null;
let selectedImagePath = null;

const tbody = document.getElementById('productsBody');
const searchInput = document.getElementById('searchInput');
const modalOverlay = document.getElementById('modalOverlay');
const modalTitle = document.getElementById('modalTitle');
const editCode = document.getElementById('editCode');
const editName = document.getElementById('editName');
const editQuantity = document.getElementById('editQuantity');
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
        <td colspan="6">
          <div class="empty-state">
            <p>${products.length === 0 ? 'No hay productos registrados' : 'No se encontraron resultados'}</p>
            <p class="sub">${products.length === 0 ? 'Haz clic en "+ Nuevo Producto" para comenzar' : 'Prueba con otros términos de búsqueda'}</p>
          </div>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = filtered.map(p => `
    <tr data-id="${p.id}">
      <td class="cell-code">
        <span class="cell-text" data-field="code">${escapeHtml(p.code)}</span>
      </td>
      <td class="name-cell">
        <span class="cell-text name-text" data-field="name" data-image="${escapeHtml(p.image_path || '')}">${escapeHtml(p.name)}</span>
      </td>
      <td>
        <div class="image-cell">
          ${p.image_path
            ? `<img class="product-image" image-path="${escapeHtml(p.image_path)}">`
            : `<span style="color:#999;font-size:11px;">Sin imagen</span>`
          }
          <button class="btn-icon" onclick="uploadImage(${p.id})" title="Cambiar imagen">🖼</button>
        </div>
      </td>
      <td>
        <span class="cell-text" data-field="quantity">${p.quantity}</span>
      </td>
      <td>
        <div class="qty-control">
          <input type="number" class="subtract-input" placeholder="0" min="0" value="" step="1">
          <button class="btn btn-danger" onclick="subtractProduct(${p.id}, this)">Restar</button>
        </div>
      </td>
      <td>
        <div class="actions-cell">
          <button class="btn-icon" onclick="editProduct(${p.id})" title="Editar">✏️</button>
          <button class="btn-icon danger" onclick="deleteProduct(${p.id})" title="Eliminar">🗑</button>
        </div>
      </td>
    </tr>
  `).join('');

  resolveImages();
}

async function resolveImages() {
  const imgs = document.querySelectorAll('.product-image[image-path]');
  for (const img of imgs) {
    const relPath = img.getAttribute('image-path');
    const fullPath = await window.electronAPI.resolveImagePath(relPath);
    img.src = `file:///${fullPath}`;
  }
}

tbody.addEventListener('dblclick', (e) => {
  const span = e.target.closest('.cell-text[data-field]');
  if (!span) return;
  const field = span.dataset.field;
  const tr = span.closest('tr');
  const id = parseInt(tr.dataset.id);
  const product = products.find(p => p.id === id);
  if (!product) return;

  const currentValue = product[field];
  const isNumber = field === 'quantity';

  const input = document.createElement('input');
  input.type = isNumber ? 'number' : 'text';
  input.value = currentValue;
  input.className = 'cell-editing';
  input.dataset.field = field;
  if (isNumber) { input.min = 0; input.style.width = '80px'; }

  const onFinish = () => {
    const newValue = isNumber ? (parseInt(input.value) || 0) : input.value;
    if (String(newValue) === String(currentValue)) {
      const span2 = document.createElement('span');
      span2.className = `cell-text${field === 'name' ? ' name-text' : ''}`;
      span2.dataset.field = field;
      if (field === 'name') span2.dataset.image = product.image_path || '';
      span2.textContent = currentValue;
      input.replaceWith(span2);
      return;
    }

    const updated = { ...product, [field]: newValue };
    window.electronAPI.updateProduct(updated).then(() => {
      product[field] = newValue;
      const span2 = document.createElement('span');
      span2.className = `cell-text${field === 'name' ? ' name-text' : ''}`;
      span2.dataset.field = field;
      if (field === 'name') span2.dataset.image = product.image_path || '';
      span2.textContent = newValue;
      input.replaceWith(span2);
      showToast('Producto actualizado');
    }).catch(() => {
      const span2 = document.createElement('span');
      span2.className = `cell-text${field === 'name' ? ' name-text' : ''}`;
      span2.dataset.field = field;
      if (field === 'name') span2.dataset.image = product.image_path || '';
      span2.textContent = currentValue;
      input.replaceWith(span2);
      showToast('Error al actualizar', true);
    });
  };

  span.replaceWith(input);
  input.focus();
  input.select();

  input.addEventListener('blur', onFinish);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { input.blur(); }
    if (e.key === 'Escape') {
      input.removeEventListener('blur', onFinish);
      const span2 = document.createElement('span');
      span2.className = `cell-text${field === 'name' ? ' name-text' : ''}`;
      span2.dataset.field = field;
      if (field === 'name') span2.dataset.image = product.image_path || '';
      span2.textContent = currentValue;
      input.replaceWith(span2);
    }
  });
});

tbody.addEventListener('mouseenter', (e) => {
  const span = e.target.closest('.name-text[data-image]');
  if (!span || !span.dataset.image) return;
  clearTimeout(tooltipHideTimeout);
  showTooltip(span, span.dataset.image);
}, true);

tbody.addEventListener('mousemove', (e) => {
  const span = e.target.closest('.name-text[data-image]');
  if (!span || !span.dataset.image || !imgTooltip.classList.contains('visible')) return;
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
    const fullPath = await window.electronAPI.resolveImagePath(imagePath);
    tooltipImage.src = `file:///${fullPath}`;
    imgTooltip.classList.add('visible');
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
    imgTooltip.classList.remove('visible');
  }, 200);
}

function editProduct(id) {
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
  } catch (err) {
    showToast('Error al actualizar imagen', true);
  }
}

async function subtractProduct(id, btn) {
  const tr = btn.closest('tr');
  const input = tr.querySelector('.subtract-input');
  const qty = parseInt(input.value);
  if (!qty || qty <= 0) {
    showToast('Ingresa una cantidad válida para restar', true);
    return;
  }

  const product = products.find(p => p.id === id);
  if (!product) return;
  if (qty > product.quantity) {
    showToast(`No hay suficiente stock. Actual: ${product.quantity}`, true);
    return;
  }

  try {
    const result = await window.electronAPI.subtractQuantity(id, qty);
    product.quantity = result.quantity;
    input.value = '';
    renderTable();
    showToast(`Restados ${qty} unidades. Stock actual: ${result.quantity}`);
  } catch (err) {
    showToast('Error al restar cantidad', true);
  }
}

async function deleteProduct(id) {
  if (!confirm('¿Estás seguro de eliminar este producto?')) return;
  try {
    await window.electronAPI.deleteProduct(id);
    products = products.filter(p => p.id !== id);
    renderTable();
    showToast('Producto eliminado');
  } catch (err) {
    showToast('Error al eliminar', true);
  }
}

function openModal(product) {
  editingId = product ? product.id : null;
  modalTitle.textContent = product ? 'Editar Producto' : 'Nuevo Producto';
  editCode.value = product ? product.code : '';
  editName.value = product ? product.name : '';
  editQuantity.value = product ? product.quantity : 0;
  selectedImagePath = null;

  if (product && product.image_path) {
    window.electronAPI.resolveImagePath(product.image_path).then(fullPath => {
      imagePreview.src = `file:///${fullPath}`;
      imagePreview.style.display = 'block';
      imagePlaceholder.style.display = 'none';
    });
  } else {
    imagePreview.style.display = 'none';
    imagePlaceholder.style.display = 'block';
  }

  modalOverlay.classList.add('active');
  editCode.focus();
}

function closeModal() {
  modalOverlay.classList.remove('active');
  editingId = null;
  selectedImagePath = null;
}

imageUploadArea.addEventListener('click', async () => {
  const result = await window.electronAPI.selectImage();
  if (!result) return;
  selectedImagePath = result;
  imagePreview.src = `file:///${result}`;
  imagePreview.style.display = 'block';
  imagePlaceholder.style.display = 'none';
});

document.getElementById('btnAddProduct').addEventListener('click', () => openModal(null));
document.getElementById('btnCloseModal').addEventListener('click', closeModal);
document.getElementById('btnCancelModal').addEventListener('click', closeModal);

document.getElementById('btnSaveProduct').addEventListener('click', async () => {
  const code = editCode.value.trim();
  const name = editName.value.trim();
  const quantity = parseInt(editQuantity.value) || 0;

  if (!code || !name) {
    showToast('Código y nombre son obligatorios', true);
    return;
  }

  let imagePath = null;
  if (selectedImagePath) {
    imagePath = await window.electronAPI.copyImageToApp(selectedImagePath);
  } else if (editingId) {
    const product = products.find(p => p.id === editingId);
    imagePath = product ? product.image_path : null;
  }

  try {
    if (editingId) {
      const product = products.find(p => p.id === editingId);
      const updated = { id: editingId, code, name, image_path: imagePath, quantity };
      await window.electronAPI.updateProduct(updated);
      Object.assign(product, updated);
      showToast('Producto actualizado');
    } else {
      const newProduct = await window.electronAPI.addProduct({ code, name, image_path: imagePath, quantity });
      products.push(newProduct);
      showToast('Producto agregado');
    }
    closeModal();
    renderTable();
  } catch (err) {
    if (err.message && err.message.includes('UNIQUE')) {
      showToast('El código ya existe', true);
    } else {
      showToast('Error al guardar', true);
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
    console.error(err);
  }
});

searchInput.addEventListener('input', renderTable);

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function showToast(message, isError = false) {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.style.background = isError ? '#d13438' : '#323130';
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s';
    setTimeout(() => toast.remove(), 300);
  }, 2500);
}

const updateBanner = document.getElementById('updateBanner');
const updateMessage = document.getElementById('updateMessage');
const updateProgress = document.getElementById('updateProgress');
const progressFill = document.getElementById('progressFill');

window.electronAPI.onUpdateAvailable((info) => {
  updateMessage.textContent = `📥 Nueva versión ${info.version} disponible`;
  updateBanner.style.display = 'flex';
});

window.electronAPI.onUpdateProgress((p) => {
  updateBanner.style.display = 'none';
  updateProgress.style.display = 'flex';
  progressFill.style.width = Math.round(p.percent) + '%';
});

window.electronAPI.onUpdateDownloaded(() => {
  updateProgress.innerHTML = '<span>✅ Actualización descargada. Reiniciando...</span>';
  setTimeout(() => window.electronAPI.installUpdate(), 1500);
});

document.getElementById('btnDownloadUpdate').addEventListener('click', () => {
  window.electronAPI.downloadUpdate();
  updateBanner.style.display = 'none';
  updateProgress.style.display = 'flex';
  progressFill.style.width = '0%';
});

document.getElementById('btnDismissUpdate').addEventListener('click', () => {
  updateBanner.style.display = 'none';
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
