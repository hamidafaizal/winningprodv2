const db = require('../config/database');
const fs = require('fs').promises;
const csv = require('csv-parse/sync');
const crypto = require('crypto');

exports.uploadCSV = async (req, res) => {
    try {
        const { rank } = req.body;
        const files = req.files;
        
        if (!files || files.length === 0) {
            return res.status(400).json({ error: 'No files uploaded' });
        }

        const sessionId = crypto.randomBytes(16).toString('hex');
        let allProducts = [];

        // Parse each CSV
        for (const file of files) {
            const content = await fs.readFile(file.path, 'utf-8');
            const records = csv.parse(content, {
                columns: true,
                skip_empty_lines: true
            });

            // Filter logic
            const filtered = records
                .filter(row => row.Tren !== 'TURUN')
                .filter(row => 
                    (row.Tren === 'NAIK' && row.isAd === 'Yes') ||
                    (row.Tren === 'NAIK' && row.isAd === 'No')
                );

            // Sort and take top N for NAIK/No
            const naikNo = filtered
                .filter(row => row.Tren === 'NAIK' && row.isAd === 'No')
                .sort((a, b) => b['Penjualan (30 Hari)'] - a['Penjualan (30 Hari)'])
                .slice(0, parseInt(rank));

            const naikYes = filtered.filter(row => 
                row.Tren === 'NAIK' && row.isAd === 'Yes'
            );

            allProducts = [...allProducts, ...naikYes, ...naikNo];
        }

        // Remove duplicates and shuffle
        const uniqueProducts = [...new Map(
            allProducts.map(item => [item.productLink, item])
        ).values()];
        
        // Shuffle
        for (let i = uniqueProducts.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [uniqueProducts[i], uniqueProducts[j]] = [uniqueProducts[j], uniqueProducts[i]];
        }

        // Save to database
        const connection = await db.getConnection();
        await connection.beginTransaction();

        try {
            // Insert session
            await connection.execute(
                'INSERT INTO upload_sessions (session_id, rank_value, total_filtered_products) VALUES (?, ?, ?)',
                [sessionId, rank, uniqueProducts.length]
            );

            // Insert products
            const products = [];
            for (let i = 0; i < uniqueProducts.length; i++) {
                const batchNumber = Math.floor(i / 100) + 1;
                const positionInBatch = (i % 100) + 1;
                
                const [result] = await connection.execute(
                    'INSERT INTO products (session_id, product_link, batch_number, position_in_batch) VALUES (?, ?, ?, ?)',
                    [sessionId, uniqueProducts[i].productLink, batchNumber, positionInBatch]
                );
                
                products.push({
                    id: result.insertId,
                    product_link: uniqueProducts[i].productLink,
                    batch_number: batchNumber,
                    position_in_batch: positionInBatch
                });
            }

            await connection.commit();

            res.json({
                status: 'success',
                session_id: sessionId,
                total_products: uniqueProducts.length,
                filtered_products: uniqueProducts.length,
                batch_count: Math.ceil(uniqueProducts.length / 100),
                products
            });

        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }

    } catch (error) {
        console.error('Upload CSV Error:', error);
        res.status(500).json({ 
            status: 'error', 
            message: error.message 
        });
    }
};

exports.saveBatch = async (req, res) => {
    try {
        const { session_id, products, threshold } = req.body;
        
        // Batch logic
        const batches = [];
        for (let i = 0; i < products.length; i += 100) {
            batches.push({
                batch_number: Math.floor(i / 100) + 1,
                links: products.slice(i, i + 100).map(p => p.product_link)
            });
        }

        res.json({
            status: 'success',
            batch_count: batches.length,
            batches
        });

    } catch (error) {
        res.status(500).json({ 
            status: 'error', 
            message: error.message 
        });
    }
};