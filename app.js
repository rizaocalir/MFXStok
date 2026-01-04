// ==========================================
// MFXStok - Main Application Logic
// ==========================================

// Application State
const AppState = {
    currentPage: 'dashboard',
    theme: 'light',
    initialized: false
};

// Initialize Application
async function initApp() {
    try {
        // Initialize database
        if (await db.init()) {
            console.log('Database initialized');
            db.monitorConnection(); // Start monitoring connection
            // Load initial data
            await loadWarehouseFilter(); // Load filter options
            await loadDashboard();
        }

        // Load theme preference
        const savedTheme = localStorage.getItem('theme') || 'light';
        setTheme(savedTheme);

        // Setup event listeners
        setupEventListeners();

        // Load initial data
        await loadDashboard();

        AppState.initialized = true;
        Toast.show('Uygulama hazır! 🚀', 'success');

    } catch (error) {
        console.error('App initialization error:', error);
        Toast.show('Başlatma hatası: ' + error.message, 'error');
    }
}

// Setup Event Listeners
function setupEventListeners() {
    // Navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            const page = e.currentTarget.dataset.page;
            navigateTo(page);
        });
    });

    // Theme toggle
    const themeToggle = document.getElementById('theme-toggle');
    themeToggle.addEventListener('click', toggleTheme);

    const darkModeToggle = document.getElementById('dark-mode-toggle');
    darkModeToggle.addEventListener('change', toggleTheme);

    // Product actions
    document.getElementById('add-product-btn').addEventListener('click', () => {
        showProductForm();
    });

    // Transaction actions
    document.getElementById('add-transaction-btn').addEventListener('click', () => {
        showTransactionForm();
    });

    // Search
    document.getElementById('product-search').addEventListener('input', (e) => {
        searchProducts(e.target.value);
    });

    // Filters
    document.getElementById('transaction-filter').addEventListener('change', loadTransactions);
    document.getElementById('warehouse-filter').addEventListener('change', loadTransactions);

    // Data management
    document.getElementById('export-data-btn').addEventListener('click', () => {
        Reports.exportToJSON();
    });

    document.getElementById('import-data-btn').addEventListener('click', () => {
        document.getElementById('import-file-input').click();
    });

    document.getElementById('import-file-input').addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            Reports.importFromJSON(file);
        }
    });

    // FAB
    document.getElementById('fab').addEventListener('click', () => {
        showTransactionForm();
    });

    // PWA Install Logic
    let deferredPrompt;
    window.addEventListener('beforeinstallprompt', (e) => {
        // Prevent Chrome 67 and earlier from automatically showing the prompt
        e.preventDefault();
        // Stash the event so it can be triggered later.
        deferredPrompt = e;
        // Update UI to notify the user they can add to home screen
        const installBtn = document.getElementById('install-btn');
        if (installBtn) {
            installBtn.style.display = 'flex';
            installBtn.addEventListener('click', () => {
                // Hide the app provided install promotion
                installBtn.style.display = 'none';
                // Show the install prompt
                deferredPrompt.prompt();
                // Wait for the user to respond to the prompt
                deferredPrompt.userChoice.then((choiceResult) => {
                    if (choiceResult.outcome === 'accepted') {
                        console.log('User accepted the A2HS prompt');
                    } else {
                        console.log('User dismissed the A2HS prompt');
                    }
                    deferredPrompt = null;
                });
            });
        }
    });

    window.addEventListener('appinstalled', () => {
        console.log('PWA was installed');
        const installBtn = document.getElementById('install-btn');
        if (installBtn) installBtn.style.display = 'none';
    });
}

// Navigation
function navigateTo(page) {
    // Update nav items
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.page === page) {
            item.classList.add('active');
        }
    });

    // Update pages
    document.querySelectorAll('.page').forEach(p => {
        p.classList.remove('active');
    });
    document.getElementById(`page-${page}`).classList.add('active');

    AppState.currentPage = page;

    // Load page data
    switch (page) {
        case 'dashboard':
            loadDashboard();
            break;
        case 'products':
            loadProducts();
            break;
        case 'transactions':
            loadTransactions();
            break;
        case 'reports':
            loadReports();
            break;
    }
}

// Theme Management
function setTheme(theme) {
    AppState.theme = theme;
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);

    const themeIcon = document.querySelector('.theme-icon');
    themeIcon.textContent = theme === 'dark' ? '☀️' : '🌙';

    const darkModeToggle = document.getElementById('dark-mode-toggle');
    darkModeToggle.checked = theme === 'dark';
}

function toggleTheme() {
    const newTheme = AppState.theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
}

// ==========================================
// Dashboard Functions
// ==========================================

async function loadDashboard() {
    await Reports.updateDashboardStats();
    await Reports.updateRecentTransactions();
}

// ==========================================
// Product Functions
// ==========================================

async function loadProducts() {
    try {
        const products = await db.getAll('products');
        const container = document.getElementById('products-list');

        if (products.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <span class="empty-icon">📦</span>
                    <p>Henüz ürün yok</p>
                    <button class="btn btn-primary" onclick="showProductForm()">
                        İlk Ürünü Ekle
                    </button>
                </div>
            `;
        } else {
            container.innerHTML = products.map(p => createProductCard(p)).join('');
        }

    } catch (error) {
        console.error('Load products error:', error);
        Toast.show('Ürünler yüklenemedi', 'error');
    }
}

async function searchProducts(query) {
    try {
        const products = await db.getAll('products');
        const filtered = products.filter(p =>
            p.name.toLowerCase().includes(query.toLowerCase()) ||
            (p.barcode && p.barcode.includes(query))
        );

        const container = document.getElementById('products-list');

        if (filtered.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <span class="empty-icon">🔍</span>
                    <p>Ürün bulunamadı</p>
                </div>
            `;
        } else {
            container.innerHTML = filtered.map(p => createProductCard(p)).join('');
        }

    } catch (error) {
        console.error('Search error:', error);
    }
}

async function saveProduct(productId) {
    try {
        const name = document.getElementById('product-name').value.trim();
        const barcode = document.getElementById('product-barcode').value.trim();
        // Warehouse removed from product creation
        const costPrice = parseFloat(document.getElementById('product-cost').value) || 0;
        const criticalStock = parseInt(document.getElementById('product-critical').value) || 0;

        if (!name) {
            Toast.show('Ürün adı gerekli', 'warning');
            return;
        }

        if (productId) {
            // Update existing product
            const product = await db.get('products', productId);
            product.name = name;
            product.barcode = barcode || null;
            product.costPrice = costPrice;
            product.criticalStock = criticalStock;
            await db.update('products', product);
            Toast.show('Ürün güncellendi', 'success');
        } else {
            // Add new product
            await db.addProduct({ name, barcode, costPrice, criticalStock });
            Toast.show('Ürün eklendi', 'success');
        }

        Modal.close();
        loadProducts();
        loadDashboard();

    } catch (error) {
        console.error('Save product error:', error);
        Toast.show('Kaydetme başarısız', 'error');
    }
}

async function editProduct(productId) {
    try {
        const product = await db.get('products', productId);
        showProductForm(product);
    } catch (error) {
        console.error('Edit product error:', error);
        Toast.show('Ürün yüklenemedi', 'error');
    }
}

async function deleteProduct(productId) {
    if (!confirm('Bu ürünü silmek istediğinizden emin misiniz?')) {
        return;
    }

    try {
        await db.delete('products', productId);
        Toast.show('Ürün silindi', 'success');
        loadProducts();
        loadDashboard();
    } catch (error) {
        console.error('Delete product error:', error);
        Toast.show('Silme başarısız', 'error');
    }
}

async function viewProduct(productId) {
    try {
        const product = await db.get('products', productId);
        const transactions = await db.getTransactionsByProduct(productId);
        const warehouses = await db.getWarehouses();

        // Calculate breakdown for display if using new stock object
        let stockBreakdown = '';
        if (product.stock && typeof product.stock === 'object') {
            const whMap = {};
            warehouses.forEach(w => whMap[w.id] = w.name);

            stockBreakdown = Object.entries(product.stock)
                .map(([whId, qty]) => {
                    const whName = whMap[whId] || 'Bilinmeyen Depo';
                    return `<div><strong>${whName}:</strong> ${qty}</div>`;
                }).join('');
        }

        const totalStock = product.totalStock !== undefined ? product.totalStock : (product.stock || 0);
        const stockValue = (totalStock * (product.costPrice || 0)).toLocaleString('tr-TR');

        const content = `
            <div style="margin-bottom: 1.5rem;">
                <h3 style="margin: 0 0 0.5rem 0;">${product.name}</h3>
                ${product.barcode ? `<p style="margin: 0; color: var(--text-secondary);">🏷️ ${product.barcode}</p>` : ''}
                ${stockBreakdown ? `<div style="margin-top: 0.5rem; font-size: 0.9rem; color: var(--text-secondary);">${stockBreakdown}</div>` : ''}
            </div>
            
            <div class="stats-grid" style="grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.5rem;">
                <div class="stat-card">
                    <div class="stat-icon">📦</div>
                    <div class="stat-info">
                        <div class="stat-label">Toplam Stok</div>
                        <div class="stat-value">${totalStock}</div>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon">💰</div>
                    <div class="stat-info">
                        <div class="stat-label">Stok Değeri (Maliyet)</div>
                        <div class="stat-value" style="font-size: 1.25rem;">${stockValue}€</div>
                    </div>
                </div>
            </div>
            
            <h4 style="margin: 1.5rem 0 1rem 0;">Son Hareketler</h4>
            <div class="transaction-list" style="max-height: 300px; overflow-y: auto;">
                ${transactions.length > 0 ?
                transactions.slice(0, 10).map(t => createTransactionItem(t)).join('') :
                '<p style="text-align: center; color: var(--text-tertiary);">Henüz hareket yok</p>'
            }
            </div>
        `;

        Modal.show(
            'Ürün Detayı',
            content,
            [
                { text: 'Kapat', class: 'btn-secondary', onclick: 'Modal.close()' },
                // FIX: Ensure ID is quoted properly for string IDs
                { text: 'Hareket Ekle', class: 'btn-primary', onclick: `Modal.close(); showTransactionForm('${productId}')` }
            ]
        );

    } catch (error) {
        console.error('View product error:', error);
        Toast.show('Ürün detayı yüklenemedi', 'error');
    }
}

// ==========================================
// Transaction Functions
// ==========================================

// Helper to populate warehouse filter
async function loadWarehouseFilter() {
    const filter = document.getElementById('warehouse-filter');
    if (!filter) return;

    try {
        const warehouses = await db.getWarehouses();
        // Keep "All" option and append regex-cleared list
        filter.innerHTML = '<option value="all">Tüm Depolar</option>';
        warehouses.forEach(wh => {
            const option = document.createElement('option');
            option.value = wh.id;
            option.textContent = wh.name;
            filter.appendChild(option);
        });
    } catch (e) {
        console.error('Filter load error:', e);
    }
}

async function loadTransactions() {
    try {
        let transactions = await db.getAll('transactions');

        // Apply filters
        const typeFilter = document.getElementById('transaction-filter').value;
        const warehouseFilter = document.getElementById('warehouse-filter').value;

        if (typeFilter !== 'all') {
            transactions = transactions.filter(t => t.type === typeFilter);
        }

        if (warehouseFilter !== 'all') {
            // Updated to check new warehouseId field or legacy warehouse string
            transactions = transactions.filter(t => t.warehouseId === warehouseFilter || t.warehouse === warehouseFilter);
        }

        // Sort by date (newest first)
        transactions.sort((a, b) => new Date(b.date) - new Date(a.date));

        const container = document.getElementById('transactions-list');

        if (transactions.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <span class="empty-icon">📝</span>
                    <p>Hareket bulunamadı</p>
                </div>
            `;
        } else {
            container.innerHTML = transactions.map(t => createTransactionItem(t)).join('');
        }

    } catch (error) {
        console.error('Load transactions error:', error);
        Toast.show('Hareketler yüklenemedi', 'error');
    }
}

async function saveTransaction() {
    try {
        const productId = document.getElementById('transaction-product').value;
        const warehouseId = document.getElementById('transaction-warehouse').value;
        const type = document.getElementById('transaction-type').value;
        const quantity = parseInt(document.getElementById('transaction-quantity').value);
        const unitPrice = parseFloat(document.getElementById('transaction-price').value);
        const notes = document.getElementById('transaction-notes').value.trim();

        // Validate required fields (allow unitPrice to be 0)
        if (!productId || !warehouseId || !quantity || isNaN(unitPrice)) {
            Toast.show('Lütfen tüm gerekli alanları doldurun', 'warning');
            return;
        }

        // Get product info
        const product = await db.get('products', productId);

        if (!product) {
            Toast.show('Ürün bulunamadı', 'error');
            return;
        }

        // Check stock for exits
        if (type === 'exit') {
            const currentStock = (product.stock && product.stock[warehouseId]) || 0;
            if (currentStock < quantity) {
                if (!confirm(`Bu depoda stok yetersiz! Mevcut: ${currentStock}, İstenen: ${quantity}. Devam edilsin mi?`)) {
                    return;
                }
            }
        }

        const transactionData = {
            productId: product.id,
            productName: product.name,
            type,
            quantity,
            unitPrice,
            warehouseId, // New field
            notes
        };

        // Add exit-specific fields
        if (type === 'exit') {
            transactionData.location = document.getElementById('transaction-location').value.trim();
            transactionData.paymentStatus = document.getElementById('transaction-payment').value;
        }

        await db.addTransaction(transactionData);

        Toast.show('Hareket kaydedildi', 'success');
        Modal.close();

        loadTransactions();
        loadDashboard();

        if (AppState.currentPage === 'products') {
            loadProducts();
        }

    } catch (error) {
        console.error('Save transaction error:', error);
        Toast.show('Kaydetme başarısız: ' + error.message, 'error');
    }
}

async function deleteTransaction(transactionId) {
    if (!confirm('Bu hareketi silmek istediğinizden emin misiniz? Stok sayısı otomatik olarak düzeltilecektir.')) {
        return;
    }

    try {
        await db.deleteTransaction(transactionId);
        Toast.show('Hareket silindi ve stok güncellendi', 'success');

        // Refresh views
        loadTransactions();
        loadDashboard();

        // If we are on products page, refresh that too
        if (AppState.currentPage === 'products') {
            loadProducts();
        }

    } catch (error) {
        console.error('Delete transaction error:', error);
        Toast.show('Silme işlemi başarısız', 'error');
    }
}

// ==========================================
// Reports Functions
// ==========================================

async function loadReports() {
    await Reports.updateDashboardStats();
    await Reports.updatePaymentStatus();
}

// ==========================================
// Settings & Warehouse Functions
// ==========================================

async function loadWarehousesSettings() {
    const list = document.getElementById('warehouses-list');
    if (!list) return;

    try {
        const warehouses = await db.getWarehouses();
        list.innerHTML = warehouses.map(wh => `
            <div class="transaction-item" style="padding: 0.5rem; display: flex; justify-content: space-between; align-items: center;">
                <span>${wh.name}</span>
                <button class="btn btn-danger" style="padding: 0.25rem 0.5rem; font-size: 0.75rem;" 
                        onclick="deleteWarehouse('${wh.id}')">Sil</button>
            </div>
        `).join('');
    } catch (e) {
        console.error(e);
    }
}

async function addWarehouse() {
    const input = document.getElementById('new-warehouse-name');
    const name = input.value.trim();
    if (!name) {
        Toast.show('Lütfen bir depo adı girin', 'warning');
        return;
    }

    try {
        await db.addWarehouse(name);
        input.value = '';
        Toast.show('Yeni depo eklendi ✅', 'success');
        // Await this to ensure list updates before user sees toast (or almost same time)
        await loadWarehousesSettings();
    } catch (e) {
        console.error('Add warehouse error:', e);
        Toast.show('Depo eklenirken hata oluştu: ' + e.message, 'error');
    }
}

async function deleteWarehouse(id) {
    if (!confirm('Depoyu silmek istediğinize emin misiniz?')) return;
    try {
        await db.deleteWarehouse(id);
        Toast.show('Depo silindi', 'success');
        loadWarehousesSettings();
    } catch (e) {
        Toast.show('Hata: ' + e.message, 'error');
    }
}

// ... existing code ...

// ==========================================
// Initialize on DOM Ready
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
    initApp();

    // Add warehouse listeners
    const addWhBtn = document.getElementById('add-warehouse-btn');
    if (addWhBtn) {
        addWhBtn.addEventListener('click', addWarehouse);
    }

    // Refresh warehouses when entering settings
    document.querySelector('.nav-item[data-page="settings"]').addEventListener('click', loadWarehousesSettings);
});

// Handle install prompt for PWA
let deferredPrompt;

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;

    // Show install button or notification
    Toast.show('Bu uygulamayı ana ekrana ekleyebilirsiniz! 📱', 'info', 5000);
});

window.addEventListener('appinstalled', () => {
    Toast.show('Uygulama başarıyla yüklendi! 🎉', 'success');
    deferredPrompt = null;
});
