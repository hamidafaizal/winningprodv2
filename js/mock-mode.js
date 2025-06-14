const MockMode = {
    enabled: false,

    enable() { this.enabled = true; },
    disable() { this.enabled = false; },

    // Mock CSV parsing result
    mockCSVResult() {
        return {
            status: 'success',
            session_id: 'mock-session-123',
            total_products: 200,
            filtered_products: 200,
            batch_count: 2,
            products: Array.from({ length: 200 }, (_, i) => ({
                id: i + 1,
                product_link: `https://shopee.co.id/product/${1000 + i}`,
                batch_number: Math.floor(i / 100) + 1,
                position_in_batch: (i % 100) + 1,
                komisi: ''
            }))
        };
    },

    // Mock Gemini API image analysis
    mockGeminiResponse(imageFile) {
        // Simulate random error or success
        const rand = Math.random();
        if (rand < 0.1) {
            return Promise.resolve({
                status: 'reupload_required',
                products_found: 3,
                commissions: [
                    { position: 1, commission: 5.5 },
                    { position: 2, commission: 6.2 },
                    { position: 3, commission: 4.8 }
                ],
                error_message: 'Jumlah produk terdeteksi tidak sama dengan 4. Silakan upload ulang atau input manual.'
            });
        }
        if (rand < 0.15) {
            return Promise.reject(new Error('Mock Gemini API timeout'));
        }
        return Promise.resolve({
            status: 'success',
            products_found: 4,
            commissions: [
                { position: 1, commission: 5.5 },
                { position: 2, commission: 6.2 },
                { position: 3, commission: 4.8 },
                { position: 4, commission: 7.1 }
            ]
        });
    },

    // Mock WhatsApp URL generation
    mockWhatsAppURL(phone, links) {
        return `https://wa.me/${phone}?text=${encodeURIComponent(links.slice(0, 5).join('\n'))}`;
    }
};

// Patch API client for mock mode
export function enableMockMode() {
    MockMode.enable();

    // Patch uploadCSV
    import('./api-client.js').then(API => {
        API.uploadCSV = async (files, rank) => {
            await new Promise(r => setTimeout(r, 800));
            return MockMode.mockCSVResult();
        };

        API.analyzeImage = async (params) => {
            await new Promise(r => setTimeout(r, 1200));
            return MockMode.mockGeminiResponse(params.image);
        };

        API.distribute = async ({ session_id, batch_number, phone_id, threshold }) => {
            await new Promise(r => setTimeout(r, 700));
            return {
                status: 'success',
                whatsapp_url: MockMode.mockWhatsAppURL('6281234567890', Array.from({ length: threshold }, (_, i) => `https://shopee.co.id/product/${batch_number * 100 + i}`)),
                batch_info: {
                    batch_number,
                    phone_name: 'Mock HP',
                    total_links: threshold
                }
            };
        };

        API.getSessionProgress = async (sessionId) => {
            await new Promise(r => setTimeout(r, 400));
            return { status: 'success', progress: 100 };
        };

        API.saveBatch = async (sessionId, products, threshold) => {
            await new Promise(r => setTimeout(r, 500));
            return {
                status: 'success',
                message: 'Batches created successfully',
                batch_count: Math.ceil(products.length / 100),
                batches: Array.from({ length: Math.ceil(products.length / 100) }, (_, i) => ({
                    batch_number: i + 1,
                    links: products.slice(i * 100, (i + 1) * 100).map(p => p.product_link)
                }))
            };
        };
    });
}

export default MockMode;