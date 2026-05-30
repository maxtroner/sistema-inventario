const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const { app } = require('electron');

const dbPath = path.join(app.getPath('userData'), 'inventario.db');
const db = new DatabaseSync(dbPath);

db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    image_path TEXT,
    quantity INTEGER NOT NULL DEFAULT 0,
    unidad TEXT DEFAULT '',
    familia TEXT DEFAULT '',
    minima INTEGER NOT NULL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

try { db.exec("ALTER TABLE products ADD COLUMN unidad TEXT DEFAULT ''"); } catch (e) {}
try { db.exec("ALTER TABLE products ADD COLUMN familia TEXT DEFAULT ''"); } catch (e) {}
try { db.exec("ALTER TABLE products ADD COLUMN minima INTEGER DEFAULT 0"); } catch (e) {}

const insertStmt = db.prepare(
  'INSERT INTO products (code, name, image_path, quantity, unidad, familia, minima) VALUES (?, ?, ?, ?, ?, ?, ?)'
);

const updateStmt = db.prepare(
  'UPDATE products SET code = ?, name = ?, image_path = ?, quantity = ?, unidad = ?, familia = ?, minima = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
);

const deleteStmt = db.prepare('DELETE FROM products WHERE id = ?');
const subtractStmt = db.prepare('UPDATE products SET quantity = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
const getAllStmt = db.prepare('SELECT * FROM products ORDER BY code ASC');
const getByIdStmt = db.prepare('SELECT * FROM products WHERE id = ?');

module.exports = {
  getProducts() {
    return getAllStmt.all();
  },

  addProduct({ code, name, image_path, quantity, unidad, familia, minima }) {
    const result = insertStmt.run(code, name, image_path || null, quantity || 0, unidad || '', familia || '', minima || 0);
    return { id: Number(result.lastInsertRowid), code, name, image_path, quantity: quantity || 0, unidad: unidad || '', familia: familia || '', minima: minima || 0 };
  },

  updateProduct({ id, code, name, image_path, quantity, unidad, familia, minima }) {
    updateStmt.run(code, name, image_path, quantity, unidad || '', familia || '', minima || 0, id);
    return { id, code, name, image_path, quantity, unidad: unidad || '', familia: familia || '', minima: minima || 0 };
  },

  deleteProduct(id) {
    deleteStmt.run(id);
    return true;
  },

  subtractQuantity(id, quantity) {
    const product = getByIdStmt.get(id);
    if (!product) throw new Error('Producto no encontrado');
    const newQty = Math.max(0, product.quantity - quantity);
    subtractStmt.run(newQty, id);
    return { ...product, quantity: newQty };
  }
};
