// ==========================================
// MFXStok - Database Manager (IndexedDB)
// ==========================================

class DatabaseManager {
    constructor() {
        this.dbName = 'MFXStokDB';
        this.version = 1;
        this.db = null;
    }

    // Initialize Database
    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.version);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                // Products Store
                if (!db.objectStoreNames.contains('products')) {
                    const productStore = db.createObjectStore('products', { 
                        keyPath: 'id', 
                        autoIncrement: true 
                    });
                    productStore.createIndex('barcode', 'barcode', { unique: false });
                    productStore.createIndex('name', 'name', { unique: false });
                    productStore.createIndex('warehouse', 'warehouse', { unique: false });
                }

                // Transactions Store
                if (!db.objectStoreNames.contains('transactions')) {
                    const transactionStore = db.createObjectStore('transactions', { 
                        keyPath: 'id', 
                        autoIncrement: true 
                    });
                    transactionStore.createIndex('productId', 'productId', { unique: false });
                    transactionStore.createIndex('type', 'type', { unique: false });
                    transactionStore.createIndex('date', 'date', { unique: false });
                    transactionStore.createIndex('warehouse', 'warehouse', { unique: false });
                }

                // Settings Store
                if (!db.objectStoreNames.contains('settings')) {
                    db.createObjectStore('settings', { keyPath: 'key' });
                }
            };
        });
    }

    // Generic CRUD Operations
    async add(storeName, data) {
        const transaction = this.db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        return new Promise((resolve, reject) => {
            const request = store.add(data);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async get(storeName, id) {
        const transaction = this.db.transaction([storeName], 'readonly');
        const store = transaction.objectStore(storeName);
        return new Promise((resolve, reject) => {
            const request = store.get(id);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async getAll(storeName) {
        const transaction = this.db.transaction([storeName], 'readonly');
        const store = transaction.objectStore(storeName);
        return new Promise((resolve, reject) => {
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async update(storeName, data) {
        const transaction = this.db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        return new Promise((resolve, reject) => {
            const request = store.put(data);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async delete(storeName, id) {
        const transaction = this.db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        return new Promise((resolve, reject) => {
            const request = store.delete(id);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    // Product-specific methods
    async addProduct(product) {
        const productData = {
            name: product.name,
            barcode: product.barcode || null,
            warehouse: product.warehouse,
            stock: 0,
            createdAt: new Date().toISOString()
        };
        return await this.add('products', productData);
    }

    async getProductByBarcode(barcode) {
        const transaction = this.db.transaction(['products'], 'readonly');
        const store = transaction.objectStore('products');
        const index = store.index('barcode');
        return new Promise((resolve, reject) => {
            const request = index.get(barcode);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async updateProductStock(productId, quantity) {
        const product = await this.get('products', productId);
        if (product) {
            product.stock = (product.stock || 0) + quantity;
            return await this.update('products', product);
        }
    }

    // Transaction-specific methods
    async addTransaction(transaction) {
        const transactionData = {
            productId: transaction.productId,
            productName: transaction.productName,
            type: transaction.type, // 'entry' or 'exit'
            quantity: transaction.quantity,
            unitPrice: transaction.unitPrice,
            totalAmount: transaction.quantity * transaction.unitPrice,
            warehouse: transaction.warehouse,
            location: transaction.location || null, // For exits
            paymentStatus: transaction.paymentStatus || 'pending', // 'paid', 'pending', 'partial'
            notes: transaction.notes || '',
            date: new Date().toISOString()
        };

        const id = await this.add('transactions', transactionData);

        // Update product stock
        const stockChange = transaction.type === 'entry' ? 
            transaction.quantity : -transaction.quantity;
        await this.updateProductStock(transaction.productId, stockChange);

        return id;
    }

    async getTransactionsByProduct(productId) {
        const allTransactions = await this.getAll('transactions');
        return allTransactions.filter(t => t.productId === productId);
    }

    async getTransactionsByType(type) {
        const allTransactions = await this.getAll('transactions');
        return allTransactions.filter(t => t.type === type);
    }

    async getTransactionsByWarehouse(warehouse) {
        const allTransactions = await this.getAll('transactions');
        return allTransactions.filter(t => t.warehouse === warehouse);
    }

    async getTransactionsByDateRange(startDate, endDate) {
        const allTransactions = await this.getAll('transactions');
        return allTransactions.filter(t => {
            const date = new Date(t.date);
            return date >= startDate && date <= endDate;
        });
    }

    // Export/Import functionality
    async exportData() {
        const products = await this.getAll('products');
        const transactions = await this.getAll('transactions');
        const settings = await this.getAll('settings');

        return {
            version: this.version,
            exportDate: new Date().toISOString(),
            data: {
                products,
                transactions,
                settings
            }
        };
    }

    async importData(importData) {
        try {
            // Clear existing data
            await this.clearStore('products');
            await this.clearStore('transactions');
            await this.clearStore('settings');

            // Import new data
            const { products, transactions, settings } = importData.data;

            for (const product of products) {
                await this.add('products', product);
            }

            for (const transaction of transactions) {
                await this.add('transactions', transaction);
            }

            for (const setting of settings) {
                await this.add('settings', setting);
            }

            return true;
        } catch (error) {
            console.error('Import error:', error);
            throw error;
        }
    }

    async clearStore(storeName) {
        const transaction = this.db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        return new Promise((resolve, reject) => {
            const request = store.clear();
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    // Settings methods
    async getSetting(key) {
        return await this.get('settings', key);
    }

    async setSetting(key, value) {
        return await this.update('settings', { key, value });
    }

    // Statistics methods
    async getStatistics() {
        const products = await this.getAll('products');
        const transactions = await this.getAll('transactions');

        const warehouse1Stock = products
            .filter(p => p.warehouse === 'warehouse1')
            .reduce((sum, p) => sum + (p.stock || 0), 0);

        const warehouse2Stock = products
            .filter(p => p.warehouse === 'warehouse2')
            .reduce((sum, p) => sum + (p.stock || 0), 0);

        const pendingPayments = transactions
            .filter(t => t.paymentStatus === 'pending' || t.paymentStatus === 'partial')
            .reduce((sum, t) => sum + t.totalAmount, 0);

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const todaySales = transactions
            .filter(t => t.type === 'exit' && new Date(t.date) >= today)
            .reduce((sum, t) => sum + t.totalAmount, 0);

        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - today.getDay());
        
        const weekSales = transactions
            .filter(t => t.type === 'exit' && new Date(t.date) >= weekStart)
            .reduce((sum, t) => sum + t.totalAmount, 0);

        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        
        const monthSales = transactions
            .filter(t => t.type === 'exit' && new Date(t.date) >= monthStart)
            .reduce((sum, t) => sum + t.totalAmount, 0);

        return {
            totalProducts: products.length,
            warehouse1Stock,
            warehouse2Stock,
            pendingPayments,
            todaySales,
            weekSales,
            monthSales
        };
    }
}

// Create global database instance
const db = new DatabaseManager();
