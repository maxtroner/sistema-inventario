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
      <td>
        <input type="text" class="cell-input" data-field="code" value="${escapeHtml(p.code)}">
      </td>
      <td>
        <input type="text" class="cell-input" data-field="name" value="${escapeHtml(p.name)}">
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
        <input type="number" class="cell-input qty-display" data-field="quantity" value="${p.quantity}" min="0" style="font-weight:600;width:80px">
      </td>
      <td>
        <div class="qty-control">
          <input type="number" class="subtract-input" placeholder="0" min="0" value="" step="1">
          <button class="btn btn-danger" onclick="subtractProduct(${p.id}, this)">Restar</button>
        </div>
      </td>
      <td>
        <div class="actions-cell">
          <button class="btn-icon danger" onclick="deleteProduct(${p.id})" title="Eliminar">🗑</button>
        </div>
      </td>
    </tr>
  `).join('');

  attachCellListeners();
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

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function attachCellListeners() {
  document.querySelectorAll('.cell-input').forEach(input => {
    let timeout;
    input.addEventListener('change', async () => {
      clearTimeout(timeout);
      const tr = input.closest('tr');
      const id = parseInt(tr.dataset.id);
      const field = input.dataset.field;
      const value = input.type === 'number' ? (parseInt(input.value) || 0) : input.value;

      const product = products.find(p => p.id === id);
      if (!product) return;

      const oldValue = product[field];
      if (String(value) === String(oldValue)) return;

      const updated = { ...product, [field]: value };
      try {
        await window.electronAPI.updateProduct(updated);
        product[field] = value;
        showToast('Producto actualizado');
      } catch (err) {
        input.value = oldValue;
        showToast('Error al actualizar', true);
      }
    });
  });
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

searchInput.addEventListener('input', renderTable);

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

loadProducts();
