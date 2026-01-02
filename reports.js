// ==========================================
// MFXStok - Reports Module
// ==========================================

class Reports {
    static async updateDashboardStats() {
        try {
            const stats = await db.getStatistics();

            // Update stat cards
            document.getElementById('total-products').textContent = stats.totalProducts;
            document.getElementById('warehouse1-stock').textContent = stats.warehouse1Stock;
            document.getElementById('warehouse2-stock').textContent = stats.warehouse2Stock;
            document.getElementById('pending-payments').textContent =
                stats.pendingPayments.toLocaleString('tr-TR') + '₺';

            // Update sales stats on reports page
            if (document.getElementById('today-sales')) {
                document.getElementById('today-sales').textContent =
                    stats.todaySales.toLocaleString('tr-TR') + '₺';
                document.getElementById('week-sales').textContent =
                    stats.weekSales.toLocaleString('tr-TR') + '₺';
                document.getElementById('month-sales').textContent =
                    stats.monthSales.toLocaleString('tr-TR') + '₺';
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
                                    ${paid.toLocaleString('tr-TR')}₺
                                </div>
                            </div>
                        </div>
                        
                        <div class="stat-card">
                            <div class="stat-icon">⏳</div>
                            <div class="stat-info">
                                <div class="stat-label">Bekleyen</div>
                                <div class="stat-value text-warning">
                                    ${pending.toLocaleString('tr-TR')}₺
                                </div>
                            </div>
                        </div>
                        
                        <div class="stat-card">
                            <div class="stat-icon">📊</div>
                            <div class="stat-info">
                                <div class="stat-label">Kısmi</div>
                                <div class="stat-value text-info">
                                    ${partial.toLocaleString('tr-TR')}₺
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
