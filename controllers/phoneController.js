const db = require('../config/database');

exports.getPhones = async (req, res) => {
    try {
        const [rows] = await db.execute(
            'SELECT id, name, whatsapp_number FROM phones WHERE is_active = 1'
        );

        res.json({
            status: 'success',
            data: rows,
            count: rows.length
        });

    } catch (error) {
        res.status(500).json({ 
            status: 'error', 
            message: error.message 
        });
    }
};