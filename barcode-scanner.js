// ==========================================
// MFXStok - Barcode Scanner Module
// ==========================================

class BarcodeScanner {
    constructor() {
        this.isScanning = false;
        this.onDetected = null;
    }

    async start(onDetected) {
        this.onDetected = onDetected;
        const container = document.getElementById('scanner-container');
        container.classList.remove('hidden');

        try {
            // Check if getUserMedia is supported
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                throw new Error('Kamera erişimi desteklenmiyor');
            }

            // Request camera permission
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment' } // Use back camera on mobile
            });

            // Create video element
            const viewport = document.getElementById('scanner-viewport');
            viewport.innerHTML = '<video id="scanner-video" style="width: 100%; height: 100%; object-fit: cover;"></video>';

            const video = document.getElementById('scanner-video');
            video.srcObject = stream;
            video.setAttribute('playsinline', true);
            await video.play();

            this.isScanning = true;
            this.stream = stream;

            // Start scanning with QuaggaJS alternative - simple canvas-based detection
            this.startDetection(video);

        } catch (error) {
            console.error('Scanner error:', error);
            Toast.show('Kamera erişimi başarısız: ' + error.message, 'error');
            this.stop();
        }
    }

    startDetection(video) {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');

        const detectFrame = () => {
            if (!this.isScanning) return;

            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            context.drawImage(video, 0, 0, canvas.width, canvas.height);

            // For demo purposes, we'll use a simple input fallback
            // In production, you would integrate a library like QuaggaJS or ZXing

            requestAnimationFrame(detectFrame);
        };

        detectFrame();
    }

    stop() {
        this.isScanning = false;

        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }

        const container = document.getElementById('scanner-container');
        container.classList.add('hidden');

        const viewport = document.getElementById('scanner-viewport');
        viewport.innerHTML = '';
    }

    // Manual barcode input fallback
    showManualInput() {
        this.stop();

        const content = `
            <div class="form-group">
                <label class="form-label">Barkod Numarası</label>
                <input type="text" class="form-input" id="manual-barcode" 
                       placeholder="Barkodu manuel girin" autofocus>
            </div>
        `;

        Modal.show('Barkod Gir', content, [
            { text: 'İptal', class: 'btn-secondary', onclick: 'Modal.close()' },
            {
                text: 'Ara',
                class: 'btn-primary',
                onclick: 'searchByManualBarcode()'
            }
        ]);
    }
}

// Global scanner instance
const scanner = new BarcodeScanner();

// Search product by manually entered barcode
async function searchByManualBarcode() {
    const barcode = document.getElementById('manual-barcode').value.trim();

    if (!barcode) {
        Toast.show('Lütfen barkod girin', 'warning');
        return;
    }

    Modal.close();

    try {
        const product = await db.getProductByBarcode(barcode);

        if (product) {
            Toast.show(`Ürün bulundu: ${product.name}`, 'success');
            viewProduct(product.id);
        } else {
            Toast.show('Ürün bulunamadı', 'warning');

            // Ask if user wants to create new product
            setTimeout(() => {
                if (confirm('Bu barkod için yeni ürün oluşturmak ister misiniz?')) {
                    showProductForm();
                    setTimeout(() => {
                        document.getElementById('product-barcode').value = barcode;
                    }, 100);
                }
            }, 500);
        }
    } catch (error) {
        console.error('Barcode search error:', error);
        Toast.show('Arama sırasında hata oluştu', 'error');
    }
}

// Initialize barcode scanner button
document.addEventListener('DOMContentLoaded', () => {
    const scanBtn = document.getElementById('scan-barcode-btn');
    if (scanBtn) {
        scanBtn.addEventListener('click', () => {
            // For now, use manual input as fallback
            // In production, you can try camera first, then fallback to manual
            scanner.showManualInput();
        });
    }

    const closeScanner = document.getElementById('close-scanner');
    if (closeScanner) {
        closeScanner.addEventListener('click', () => scanner.stop());
    }
});
