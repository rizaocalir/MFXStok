// ==========================================
// MFXStok - Database Manager (Firebase Firestore)
// ==========================================

// ⚠️ ÖNEMLİ: Kendi Firebase Config bilgilerinizi buraya yapıştırın!
// Firebase Console -> Project Settings -> General -> Your apps -> SDK setup and configuration (CDN)
const firebaseConfig = {
    apiKey: "AIzaSyCfKWJ5anQTig9FQiImYFfDw1pvps3rIe0",
    authDomain: "mfxstok.firebaseapp.com",
    projectId: "mfxstok",
    storageBucket: "mfxstok.firebasestorage.app",
    messagingSenderId: "559678186434",
    appId: "1:559678186434:web:c2368b132b82f8e9c26c5b",
    measurementId: "G-06Q96ZFP3G"
};

// Initialize Firebase
let validConfig = false;
try {
    if (firebaseConfig.apiKey && firebaseConfig.apiKey !== "AIzaSy...") {
        firebase.initializeApp(firebaseConfig);
        validConfig = true;
    } else {
        console.warn("Firebase config bilgileri girilmemiş!");
    }
} catch (e) {
    console.error("Firebase başlatma hatası:", e);
}

class DatabaseManager {
    constructor() {
        this.db = validConfig ? firebase.firestore() : null;
    }

    async init() {
        if (!this.db) {
            console.error("Veritabanı bağlantısı yok. Lütfen db.js dosyasındaki firebaseConfig alanını doldurun.");
            throw new Error("Veritabanı ayarları yapılmamış");
        }

        // Firestore offline persistence (opsiyonel, tarayıcı desteklerse)
        try {
            await this.db.enablePersistence();
        } catch (err) {
            if (err.code == 'failed-precondition') {
                console.log("Çok fazla tab açık, offline mod kapalı.");
            } else if (err.code == 'unimplemented') {
                console.log("Tarayıcı offline modu desteklemiyor.");
            }
        }

        return true;
        return true;
    }

    monitorConnection() {
        const updateStatus = (isOnline) => {
            const statusEl = document.getElementById('connection-status');
            if (statusEl) {
                if (isOnline) {
                    statusEl.classList.remove('offline');
                    statusEl.classList.add('online');
                    statusEl.title = "Bağlı (Online)";
                } else {
                    statusEl.classList.remove('online');
                    statusEl.classList.add('offline');
                    statusEl.title = "Bağlantı Yok (Offline)";
                }
            }
        };

        // Network status (Browser)
        window.addEventListener('online', () => updateStatus(true));
        window.addEventListener('offline', () => updateStatus(false));

        // Initial check
        updateStatus(navigator.onLine);

        // Firebase connection status (if available)
        if (this.db) {
            // Note: firestore .info/connected is a special path
            // However, for basic web SDK, standard window online/offline is often enough
            // But let's try to be more precise if possible, though .info/connected is for RTDB
            // For Firestore, we rely mostly on navigator.onLine and error handling
        }
    }

    // Generic Methods
    async getAll(collectionName) {
        const snapshot = await this.db.collection(collectionName).get();
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
    }

    async get(collectionName, id) {
        const doc = await this.db.collection(collectionName).doc(id).get();
        if (doc.exists) {
            return { id: doc.id, ...doc.data() };
        }
        return null;
    }

    async add(collectionName, data) {
        const docRef = await this.db.collection(collectionName).add(data);
        return docRef.id;
    }

    async update(collectionName, data) {
        // data must have an id
        const { id, ...updateData } = data;
        await this.db.collection(collectionName).doc(id).update(updateData);
        return id;
    }

    async delete(collectionName, id) {
        await this.db.collection(collectionName).doc(id).delete();
    }

    // Warehouse Methods
    async getWarehouses() {
        const snapshot = await this.db.collection('warehouses').get();
        if (snapshot.empty) {
            // Create defaults
            await this.add('warehouses', { name: 'Merkez Depo' });
            return await this.getWarehouses();
        }
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }

    async addWarehouse(name) {
        return await this.add('warehouses', { name });
    }

    async deleteWarehouse(id) {
        await this.delete('warehouses', id);
    }

    // Product Methods
    async addProduct(product) {
        const productData = {
            name: product.name,
            barcode: product.barcode || null,
            // Warehouse removed from product definition, now handled in transactions/stock
            costPrice: Number(product.costPrice) || 0,
            criticalStock: Number(product.criticalStock) || 5,
            stock: {}, // Map: { warehouseId: quantity }
            totalStock: 0,
            createdAt: new Date().toISOString()
        };
        return await this.add('products', productData);
    }

    async getProductByBarcode(barcode) {
        const snapshot = await this.db.collection('products')
            .where('barcode', '==', barcode)
            .get();

        if (!snapshot.empty) {
            const doc = snapshot.docs[0];
            return { id: doc.id, ...doc.data() };
        }
        return null;
    }

    async updateProductStock(productId, quantityChange, warehouseId) {
        const productRef = this.db.collection('products').doc(productId);

        await this.db.runTransaction(async (transaction) => {
            const productDoc = await transaction.get(productRef);
            if (!productDoc.exists) throw "Ürün bulunamadı!";

            const data = productDoc.data();
            let currentStock = data.stock || {};

            // Handle legacy data (if stock was a number)
            if (typeof currentStock === 'number') {
                currentStock = {};
            }

            const oldQty = currentStock[warehouseId] || 0;
            const newQty = oldQty + quantityChange;

            currentStock[warehouseId] = newQty;

            // Recalculate total
            const totalStock = Object.values(currentStock).reduce((a, b) => a + b, 0);

            transaction.update(productRef, {
                stock: currentStock,
                totalStock: totalStock
            });
        });
    }

    // Transaction Methods
    async addTransaction(transaction) {
        const transactionData = {
            productId: transaction.productId,
            productName: transaction.productName,
            type: transaction.type,
            quantity: transaction.quantity,
            unitPrice: transaction.unitPrice,
            totalAmount: transaction.quantity * transaction.unitPrice,
            warehouseId: transaction.warehouseId, // Specific warehouse
            location: transaction.location || null,
            paymentStatus: transaction.paymentStatus || 'pending',
            notes: transaction.notes || '',
            date: new Date().toISOString()
        };

        const id = await this.add('transactions', transactionData);

        // Update product stock in specific warehouse
        const stockChange = transaction.type === 'entry' ?
            transaction.quantity : -transaction.quantity;

        await this.updateProductStock(transaction.productId, stockChange, transaction.warehouseId);

        return id;
    }

    async deleteTransaction(transactionId) {
        // Get transaction first to know quantity
        const transaction = await this.get('transactions', transactionId);
        if (!transaction) return;

        // Reverse stock
        const reverseStockChange = transaction.type === 'entry' ?
            -transaction.quantity : transaction.quantity;

        await this.updateProductStock(transaction.productId, reverseStockChange, transaction.warehouseId);

        // Delete record
        await this.delete('transactions', transactionId);
    }

    async getTransactionsByProduct(productId) {
        const snapshot = await this.db.collection('transactions')
            .where('productId', '==', productId)
            .get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }

    // Statistics (Client-side calculation for now to keep it simple free tier)
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

const db = new DatabaseManager();
