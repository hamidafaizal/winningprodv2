const db = require('../config/database');

exports.analyzeImage = async (req, res) => {
    try {
        const { session_id, batch_number, screenshot_number } = req.body;
        const imageFile = req.file;

        // Mock Gemini response for now
        const mockResponse = {
            products: [
                { position: 1, commission: 5.5 },
                { position: 2, commission: 6.0 },
                { position: 3, commission: 4.5 },
                { position: 4, commission: 7.0 }
            ]
        };

        // Save to database
        const connection = await db.getConnection();
        try {
            // Update products with commission
            for (const prod of mockResponse.products) {
                await connection.execute(
                    'UPDATE products SET commission = ? WHERE session_id = ? AND batch_number = ? AND position_in_batch = ?',
                    [prod.commission, session_id, batch_number, prod.position]
                );
            }

            res.json({
                status: 'success',
                products_found: 4,
                commissions: mockResponse.products
            });

        } finally {
            connection.release();
        }

    } catch (error) {
        res.status(500).json({ 
            status: 'error', 
            message: error.message 
        });
    }
};