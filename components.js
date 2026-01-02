// ==========================================
// MFXStok - UI Components
// ==========================================

// Toast Notification System
class Toast {
    static show(message, type = 'info', duration = 3000) {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <div style="display: flex; align-items: center; gap: 0.5rem;">
                <span>${this.getIcon(type)}</span>
                <span>${message}</span>
            </div>
        `;

        container.appendChild(toast);

        setTimeout(() => {
            toast.style.animation = 'slideOut 0.25s ease-in-out';
            setTimeout(() => toast.remove(), 250);
        }, duration);
    }

    static getIcon(type) {
        const icons = {
            success: '✅',
            error: '❌',
            info: 'ℹ️',
            warning: '⚠️'
        };
        return icons[type] || icons.info;
    }
}

// Modal System
class Modal {
    static show(title, content, buttons = []) {
        const container = document.getElementById('modal-container');

        const buttonsHTML = buttons.map(btn => `
            <button class="btn ${btn.class || 'btn-secondary'}" 
                    onclick="${btn.onclick}"
                    ${btn.id ? `id="${btn.id}"` : ''}>
                ${btn.text}
            </button>
        `).join('');

        container.innerHTML = `
            <div class="modal-overlay" onclick="Modal.close()">
                <div class="modal-content" onclick="event.stopPropagation()">
                    <div class="modal-header">
                        <h3>${title}</h3>
                        <button class="btn-close" onclick="Modal.close()">✕</button>
                    </div>
                    <div class="modal-body">
                        ${content}
                    </div>
                    <div class="modal-footer">
                        ${buttonsHTML}
                    </div>
                </div>
            </div>
        `;

        // Add modal styles if not already present
        if (!document.getElementById('modal-styles')) {
            const style = document.createElement('style');
            style.id = 'modal-styles';
            style.textContent = `
                .modal-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0, 0, 0, 0.7);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 2000;
                    padding: 1rem;
                    animation: fadeIn 0.25s ease-in-out;
                }
                
                .modal-content {
                    background: var(--bg-primary);
                    border-radius: var(--radius-xl);
                    max-width: 500px;
                    width: 100%;
                    max-height: 90vh;
                    overflow-y: auto;
                    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
                    animation: slideUp 0.25s ease-in-out;
                }
                
                @keyframes slideUp {
                    from {
                        transform: translateY(20px);
                        opacity: 0;
                    }
                    to {
                        transform: translateY(0);
                        opacity: 1;
                    }
                }
                
                .modal-header {
                    padding: 1.5rem;
                    border-bottom: 1px solid var(--border);
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                
                .modal-header h3 {
                    margin: 0;
                    font-size: 1.25rem;
                    color: var(--text-primary);
                }
                
                .modal-body {
                    padding: 1.5rem;
                }
                
                .modal-footer {
                    padding: 1.5rem;
                    border-top: 1px solid var(--border);
                    display: flex;
                    gap: 0.5rem;
                    justify-content: flex-end;
                }
                
                .form-group {
                    margin-bottom: 1rem;
                }
                
                .form-label {
                    display: block;
                    margin-bottom: 0.5rem;
                    font-weight: 500;
                    color: var(--text-primary);
                }
                
                .form-input, .form-select, .form-textarea {
                    width: 100%;
                    padding: 0.75rem;
                    border: 1px solid var(--border);
                    border-radius: var(--radius-md);
                    font-size: 1rem;
                    font-family: var(--font-family);
                    background: var(--bg-primary);
                    color: var(--text-primary);
                    transition: all 0.15s ease-in-out;
                }
                
                .form-input:focus, .form-select:focus, .form-textarea:focus {
                    outline: none;
                    border-color: var(--primary);
                    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
                }
                
                .form-textarea {
                    resize: vertical;
                    min-height: 80px;
                }
            `;
            document.head.appendChild(style);
        }
    }

    static close() {
        const container = document.getElementById('modal-container');
        container.innerHTML = '';
    }
}

// Product Card Component
function createProductCard(product) {
    // Determine stock status based on critical level
    const criticalLevel = product.criticalStock || 5;
    const stockStatus = product.stock > criticalLevel ? 'success' :
        product.stock > 0 ? 'warning' : 'danger';

    // Status badges
    const statusBadges = {
        success: { text: 'Stokta', color: 'var(--success)' },
        warning: { text: 'Kritik Düşük', color: 'var(--warning)' },
        danger: { text: 'Tükendi', color: 'var(--danger)' }
    };

    const status = statusBadges[stockStatus];
    const costDisplay = product.costPrice ?
        `<div style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 0.25rem;">Maliyet: ${product.costPrice}€</div>` : '';

    return `
        <div class="product-card" onclick="viewProduct('${product.id}')" style="border-left: 4px solid ${status.color};">
            <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 1rem;">
                <div>
                    <h3 style="margin: 0; font-size: 1.125rem; color: var(--text-primary);">
                        ${product.name}
                    </h3>
                    ${product.barcode ? `
                        <p style="margin: 0.25rem 0 0 0; font-size: 0.875rem; color: var(--text-secondary); font-family: monospace;">
                            ${product.barcode}
                        </p>
                    ` : ''}
                    ${costDisplay}
                </div>
                <div class="stock-badge ${stockStatus}" style="background: ${status.color}20; color: ${status.color}; padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.75rem; font-weight: 600;">
                    ${status.text}
                </div>
            </div>
            
            <div style="display: flex; justify-content: space-between; align-items: end;">
                <div>
                    <span style="font-size: 0.75rem; color: var(--text-tertiary); display: block; margin-bottom: 0.25rem;">STOK ADEDİ</span>
                    <span style="font-size: 1.5rem; font-weight: 700; color: var(--text-primary);">${product.stock}</span>
                </div>
                <div style="text-align: right;">
                    <span style="font-size: 0.75rem; color: var(--text-tertiary); display: block; margin-bottom: 0.25rem;">DEPO</span>
                    <span style="font-size: 0.875rem; color: var(--text-secondary);">
                        ${product.warehouse === 'warehouse1' ? 'Depo 1' : 'Depo 2'}
                    </span>
                </div>
            </div>
            <button class="btn btn-danger" style="width: 100%; margin-top: 1rem; padding: 0.5rem;" 
                    onclick="event.stopPropagation(); deleteProduct('${product.id}')">
                🗑️ Ürünü Sil
            </button>
        </div>
    `;
}

// Transaction Item Component
function createTransactionItem(transaction) {
    const typeIcon = transaction.type === 'entry' ? '📥' : '📤';
    const typeColor = transaction.type === 'entry' ? 'success' : 'info';
    const paymentBadge = {
        paid: '<span style="color: var(--success);">✅ Ödendi</span>',
        pending: '<span style="color: var(--warning);">⏳ Bekliyor</span>',
        partial: '<span style="color: var(--info);">📊 Kısmi</span>'
    };

    return `
        <div class="transaction-item">
            <div style="display: flex; align-items: center; gap: 1rem; flex: 1;">
                <span style="font-size: 1.5rem;">${typeIcon}</span>
                <div style="flex: 1;">
                    <div style="font-weight: 600; color: var(--text-primary);">
                        ${transaction.productName}
                    </div>
                    <div style="font-size: 0.875rem; color: var(--text-secondary);">
                        ${new Date(transaction.date).toLocaleDateString('tr-TR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    })}
                        ${transaction.location ? ` • ${transaction.location}` : ''}
                    </div>
                    ${transaction.type === 'exit' ? `
                        <div style="font-size: 0.75rem; margin-top: 0.25rem;">
                            ${paymentBadge[transaction.paymentStatus]}
                        </div>
                    ` : ''}
                </div>
            </div>
            <div style="text-align: right;">
                <div style="font-weight: 700; color: var(--text-primary);">
                    ${transaction.totalAmount.toLocaleString('tr-TR')}€
                </div>
                <div style="font-size: 0.875rem; color: var(--text-secondary);">
                    ${transaction.quantity} adet
                </div>
                <button class="btn btn-danger" style="padding: 0.25rem 0.5rem; margin-top: 0.5rem; font-size: 0.75rem;" 
                        onclick="deleteTransaction(${transaction.id})">
                    🗑️ Sil
                </button>
            </div>
        </div>
    `;
}

// Product Form Modal
function showProductForm(product = null) {
    const isEdit = product !== null;
    const title = isEdit ? 'Ürün Düzenle' : 'Yeni Ürün Ekle';

    const content = `
        <form id="product-form" onsubmit="event.preventDefault(); saveProduct(${isEdit ? product.id : 'null'});">
            <div class="form-group">
                <label class="form-label">Ürün Adı *</label>
                <input type="text" class="form-input" id="product-name" 
                       value="${isEdit ? product.name : ''}" required>
            </div>
            
            <div class="form-group">
                <label class="form-label">Barkod (İsteğe bağlı)</label>
                <div style="display: flex; gap: 0.5rem;">
                    <input type="text" class="form-input" id="product-barcode" 
                           value="${isEdit ? (product.barcode || '') : ''}"
                           placeholder="Barkod okutun veya yazın">
                    <button type="button" class="btn btn-secondary" onclick="startScanner('product-barcode')">📷</button>
                </div>
            </div>
            
            <div class="form-group">
                <label class="form-label">Maliyet Fiyatı (€)</label>
                <input type="number" class="form-input" id="product-cost" min="0" step="0.01" placeholder="0.00"
                       value="${isEdit ? (product.cost || '') : ''}">
            </div>

            <div class="form-group">
                <label class="form-label">Kritik Stok Seviyesi</label>
                <input type="number" class="form-input" id="product-critical" min="1" placeholder="Örn: 5"
                       value="${isEdit ? (product.criticalStock || 5) : 5}">
                <small style="color: var(--text-secondary); font-size: 0.75rem;">Stok bu sayının altına düşerse uyarı verilir.</small>
            </div>

            <div class="form-group">
                <label class="form-label">Depo *</label>
                <select class="form-select" id="product-warehouse" required>
                    <option value="warehouse1" ${isEdit && product.warehouse === 'warehouse1' ? 'selected' : ''}>
                        🏢 Depo 1
                    </option>
                    <option value="warehouse2" ${isEdit && product.warehouse === 'warehouse2' ? 'selected' : ''}>
                        🏭 Depo 2
                    </option>
                </select>
            </div>
        </form>
    `;

    Modal.show(title, content, [
        { text: 'İptal', class: 'btn-secondary', onclick: 'Modal.close()' },
        { text: isEdit ? 'Güncelle' : 'Ekle', class: 'btn-primary', onclick: `saveProduct(${isEdit ? product.id : 'null'})` }
    ]);
}

// Transaction Form Modal
function showTransactionForm(productId = null) {
    const content = `
        <form id="transaction-form" onsubmit="event.preventDefault(); saveTransaction();">
            ${!productId ? `
                <div class="form-group">
                    <label class="form-label">Ürün *</label>
                    <select class="form-select" id="transaction-product" required>
                        <option value="">Ürün Seçin</option>
                    </select>
                </div>
            ` : `<input type="hidden" id="transaction-product" value="${productId}">`}
            
            <div class="form-group">
                <label class="form-label">İşlem Tipi *</label>
                <select class="form-select" id="transaction-type" required onchange="toggleExitFields()">
                    <option value="entry">📥 Giriş</option>
                    <option value="exit">📤 Çıkış</option>
                </select>
            </div>
            
            <div class="form-group">
                <label class="form-label">Adet *</label>
                <input type="number" class="form-input" id="transaction-quantity" 
                       min="1" required>
            </div>
            
            <div class="form-group">
                <label class="form-label">Birim Fiyat (€) *</label>
                <input type="number" class="form-input" id="transaction-price" 
                       min="0" step="0.01" required>
            </div>
            
            <div id="exit-fields" style="display: none;">
                <div class="form-group">
                    <label class="form-label">Satış Yeri / Müşteri</label>
                    <input type="text" class="form-input" id="transaction-location" 
                           placeholder="Nereye satıldı?">
                </div>
                
                <div class="form-group">
                    <label class="form-label">Ödeme Durumu</label>
                    <select class="form-select" id="transaction-payment">
                        <option value="paid">✅ Ödendi</option>
                        <option value="pending">⏳ Bekliyor</option>
                        <option value="partial">📊 Kısmi Ödendi</option>
                    </select>
                </div>
            </div>
            
            <div class="form-group">
                <label class="form-label">Notlar</label>
                <textarea class="form-textarea" id="transaction-notes" 
                          placeholder="Opsiyonel notlar..."></textarea>
            </div>
        </form>
    `;

    Modal.show('Yeni Hareket Ekle', content, [
        { text: 'İptal', class: 'btn-secondary', onclick: 'Modal.close()' },
        { text: 'Kaydet', class: 'btn-primary', onclick: 'saveTransaction()' }
    ]);

    // Load products if needed
    if (!productId) {
        loadProductsToSelect();
    }
}

// Helper function to toggle exit-specific fields
function toggleExitFields() {
    const type = document.getElementById('transaction-type').value;
    const exitFields = document.getElementById('exit-fields');
    exitFields.style.display = type === 'exit' ? 'block' : 'none';
}

// Load products into select dropdown
async function loadProductsToSelect() {
    const products = await db.getAll('products');
    const select = document.getElementById('transaction-product');

    products.forEach(product => {
        const option = document.createElement('option');
        option.value = product.id;
        option.textContent = `${product.name} (${product.warehouse === 'warehouse1' ? 'Depo 1' : 'Depo 2'})`;
        select.appendChild(option);
    });
}
