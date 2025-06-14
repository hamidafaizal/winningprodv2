const db = require('../config/database');

exports.distribute = async (req, res) => {
    try {
        const { session_id, batch_number, phone_id, threshold } = req.body;

        // Get phone info
        const [phones] = await db.execute(
            'SELECT * FROM phones WHERE id = ?',
            [phone_id]
        );

        if (!phones.length) {
            return res.status(400).json({ 
                status: 'error', 
                message: 'Phone not found' 
            });
        }

        // Get links
        const [links] = await db.execute(
            'SELECT product_link FROM products WHERE session_id = ? AND batch_number = ? LIMIT ?',
            [session_id, batch_number, threshold]
        );

        // Generate WhatsApp URL
        const message = links.map(l => l.product_link).join('\n');
        const whatsappUrl = `https://wa.me/${phones[0].whatsapp_number}?text=${encodeURIComponent(message)}`;

        res.json({
            status: 'success',
            whatsapp_url: whatsappUrl,
            batch_info: {
                batch_number,
                phone_name: phones[0].name,
                total_links: links.length
            }
        });

    } catch (error) {
        res.status(500).json({ 
            status: 'error', 
            message: error.message 
        });
    }
};