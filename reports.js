// ==========================================
// MFXStok - Reports Module
// ==========================================

class Reports {
    static async updateDashboardStats() {
        try {
            const products = await db.getAll('products');
            const transactions = await db.getAll('transactions');

            // 1. Calculate Total Stock Value (Maliyet Değeri)
            const totalStockValue = products.reduce((sum, p) => {
                const stock = p.totalStock !== undefined ? p.totalStock : (p.stock || 0);
                const cost = p.costPrice || 0;
                return sum + (stock * cost);
            }, 0);

            // 2. Calculate Pending Payments (Alacaklar) - Only from Exits
            const pendingPayments = transactions
                .filter(t => t.type === 'exit' && (t.paymentStatus === 'pending' || t.paymentStatus === 'partial'))
                .reduce((sum, t) => {
                    // For now assuming full amount is pending if status is pending
                    // If partial, ideally we need 'paidAmount' field, but for now we can't know. 
                    // Let's assume full amount for pending, and maybe 50% for partial if no data, 
                    // or just sum totalAmount for simplicity until schema update.
                    return sum + t.totalAmount;
                }, 0);

            // Warehouse stocks calculation
            const warehouses = await db.getWarehouses();
            const warehouseStats = {};

            // Initialize stats for each warehouse
            warehouses.forEach(w => {
                warehouseStats[w.id] = { name: w.name, count: 0, value: 0 };
            });

            // Calculate totals
            products.forEach(p => {
                const cost = p.costPrice || 0;
                if (p.stock && typeof p.stock === 'object') {
                    Object.entries(p.stock).forEach(([whId, qty]) => {
                        if (warehouseStats[whId]) {
                            warehouseStats[whId].count += qty;
                            warehouseStats[whId].value += (qty * cost);
                        }
                    });
                }
            });

            // Generate HTML for warehouse cards
            const warehouseCardsHTML = warehouses.map(w => {
                const stat = warehouseStats[w.id];
                return `
                    <div class="stat-card">
                        <div class="stat-icon">🏭</div>
                        <div class="stat-info">
                            <div class="stat-label">${w.name}</div>
                            <div class="stat-value">${stat.count} <span style="font-size: 0.8rem; color: var(--text-secondary);">(${stat.value.toLocaleString('tr-TR')}€)</span></div>
                        </div>
                    </div>
                `;
            }).join('');

            // Update UI - Inject dynamic cards into a container
            // We need to change the HTML structure slightly to accommodate dynamic cards
            const statsGrid = document.querySelector('.stats-grid');
            if (statsGrid) {
                // Keep the first static card (Total Products) and append dynamic ones
                // OR rewrite the whole grid
                statsGrid.innerHTML = `
                    <div class="stat-card">
                        <div class="stat-icon">📦</div>
                        <div class="stat-info">
                            <div class="stat-label">Toplam Ürün</div>
                            <div class="stat-value" id="total-products">${products.length}</div>
                        </div>
                    </div>
                    ${warehouseCardsHTML}
                    <div class="stat-card" title="Toplam Stok Maliyeti: ${totalStockValue.toLocaleString('tr-TR')}€">
                        <div class="stat-icon">💰</div>
                        <div class="stat-info">
                            <div class="stat-label">Bekleyen Ödeme</div>
                            <div class="stat-value" id="pending-payments">${pendingPayments.toLocaleString('tr-TR') + '€'}</div>
                        </div>
                    </div>
                `;
            }

            // Update sales stats on reports page
            if (document.getElementById('today-sales')) {
                // ... (existing sales logic is fine if it uses 'stats' object, but I should recalculate here or use the method)
                // Re-implementing sales calc locally to be safe or call generateSalesReport
                const salesReport = await this.generateSalesReport('today');
                document.getElementById('today-sales').textContent = salesReport.totalSales.toLocaleString('tr-TR') + '€';

                const weekReport = await this.generateSalesReport('week');
                document.getElementById('week-sales').textContent = weekReport.totalSales.toLocaleString('tr-TR') + '€';

                const monthReport = await this.generateSalesReport('month');
                document.getElementById('month-sales').textContent = monthReport.totalSales.toLocaleString('tr-TR') + '€';
            }

        } catch (error) {
            console.error('Stats update error:', error);
        }
    }

    static async updateRecentTransactions() {
        try {
            const transactions = await db.getAll('transactions');
            const recent = transactions
                .sort((a, b) => new Date(b.date) - new Date(a.date))
                .slice(0, 5);

            const container = document.getElementById('recent-transactions');

            if (recent.length === 0) {
                container.innerHTML = `
                    <div class="empty-state">
                        <span class="empty-icon">📭</span>
                        <p>Henüz hareket yok</p>
                    </div>
                `;
            } else {
                container.innerHTML = recent.map(t => createTransactionItem(t)).join('');
            }

        } catch (error) {
            console.error('Recent transactions error:', error);
        }
    }

    static async updatePaymentStatus() {
        try {
            const transactions = await db.getAll('transactions');
            const exits = transactions.filter(t => t.type === 'exit');

            const paid = exits.filter(t => t.paymentStatus === 'paid')
                .reduce((sum, t) => sum + t.totalAmount, 0);
            const pending = exits.filter(t => t.paymentStatus === 'pending')
                .reduce((sum, t) => sum + t.totalAmount, 0);
            const partial = exits.filter(t => t.paymentStatus === 'partial')
                .reduce((sum, t) => sum + t.totalAmount, 0);

            const container = document.getElementById('payment-status');
            if (container) {
                container.innerHTML = `
                    <div class="stats-grid">
                        <div class="stat-card">
                            <div class="stat-icon">✅</div>
                            <div class="stat-info">
                                <div class="stat-label">Ödenen</div>
                                <div class="stat-value text-success">
                                    ${paid.toLocaleString('tr-TR')}€
                                </div>
                            </div>
                        </div>
                        
                        <div class="stat-card">
                            <div class="stat-icon">⏳</div>
                            <div class="stat-info">
                                <div class="stat-label">Bekleyen</div>
                                <div class="stat-value text-warning">
                                    ${pending.toLocaleString('tr-TR')}€
                                </div>
                            </div>
                        </div>
                        
                        <div class="stat-card">
                            <div class="stat-icon">📊</div>
                            <div class="stat-info">
                                <div class="stat-label">Kısmi</div>
                                <div class="stat-value text-info">
                                    ${partial.toLocaleString('tr-TR')}€
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            }

        } catch (error) {
            console.error('Payment status error:', error);
        }
    }

    static async generateSalesReport(period = 'month') {
        try {
            const transactions = await db.getAll('transactions');
            const exits = transactions.filter(t => t.type === 'exit');

            const now = new Date();
            let startDate;

            switch (period) {
                case 'today':
                    startDate = new Date(now.setHours(0, 0, 0, 0));
                    break;
                case 'week':
                    startDate = new Date(now.setDate(now.getDate() - now.getDay()));
                    break;
                case 'month':
                    startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                    break;
                default:
                    startDate = new Date(0);
            }

            const periodTransactions = exits.filter(t => new Date(t.date) >= startDate);

            const totalSales = periodTransactions.reduce((sum, t) => sum + t.totalAmount, 0);
            const totalQuantity = periodTransactions.reduce((sum, t) => sum + t.quantity, 0);

            return {
                period,
                totalSales,
                totalQuantity,
                transactionCount: periodTransactions.length,
                transactions: periodTransactions
            };

        } catch (error) {
            console.error('Sales report error:', error);
            return null;
        }
    }

    static async exportToJSON() {
        try {
            const data = await db.exportData();
            const json = JSON.stringify(data, null, 2);
            const blob = new Blob([json], { type: 'application/json' });
            const url = URL.createObjectURL(blob);

            const a = document.createElement('a');
            a.href = url;
            a.download = `mfxstok-backup-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            Toast.show('Veriler başarıyla dışa aktarıldı', 'success');

        } catch (error) {
            console.error('Export error:', error);
            Toast.show('Dışa aktarma başarısız', 'error');
        }
    }

    static async importFromJSON(file) {
        try {
            const text = await file.text();
            const data = JSON.parse(text);

            if (!data.data || !data.data.products || !data.data.transactions) {
                throw new Error('Geçersiz veri formatı');
            }

            await db.importData(data);

            Toast.show('Veriler başarıyla içe aktarıldı', 'success');

            // Refresh all views
            setTimeout(() => {
                location.reload();
            }, 1000);

        } catch (error) {
            console.error('Import error:', error);
            Toast.show('İçe aktarma başarısız: ' + error.message, 'error');
        }
    }
}
