  const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const nodemailer = require('nodemailer');
const { sendSmsFmc } = require('./txtfmcsms');
// Import axios for FMCSMS API requests
const axios = require('axios');

const envPath = path.resolve(__dirname, '.env');
dotenv.config({ path: envPath });
console.log('Server cwd:', process.cwd());
console.log('Using env file:', envPath);
console.log('DB_PASSWORD loaded:', process.env.DB_PASSWORD ? 'YES' : 'NO');

const app = express();
const PORT = process.env.SERVER_PORT || 3002;
    
// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..')));

// MySQL Pool Connection
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Email Transporter Configuration
const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT ? Number(process.env.EMAIL_PORT) : 587,
    secure: process.env.EMAIL_SECURE === 'true',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

async function withConnection(callback) {
    const connection = await pool.getConnection();
    try {
        return await callback(connection);
    } finally {
        connection.release();
    }
}

// ============= CUSTOMERS API =============

// Get all customers
app.get('/api/customers', async (req, res) => {
    if (!isDbReady) {
        return res.status(503).json({ error: 'Database not ready' });
    }
    try {
        const connection = await pool.getConnection();
        const [rows] = await connection.query('SELECT * FROM customers ORDER BY created_at DESC');
        connection.release();
        res.json(rows);
    } catch (error) {
        console.error('Error fetching customers:', error);
        res.status(500).json({ error: 'Failed to fetch customers' });
    }
});

// Create customer
app.post('/api/customers', async (req, res) => {

    if (!isDbReady) {
        return res.status(503).json({ error: 'Database not ready' });
    }

    const { customerName, contactNumber } = req.body;

    if (!customerName || !contactNumber) {
        return res.status(400).json({ error: 'customerName and contactNumber are required' });
    }

    try {
        const connection = await pool.getConnection();

        // Allow duplicate customer creation attempts:
        // If contactNumber already exists (UNIQUE), return the existing customer.
        const [rows] = await connection.query(
            'SELECT id, customerName, contactNumber FROM customers WHERE contactNumber = ? LIMIT 1',
            [contactNumber]
        );

        if (rows && rows.length > 0) {
            connection.release();
            return res.status(200).json({
                id: rows[0].id,
                customerName: rows[0].customerName,
                contactNumber: rows[0].contactNumber,
                message: 'Customer already exists (duplicate contactNumber)'
            });
        }

        const [result] = await connection.query(
            'INSERT INTO customers (customerName, contactNumber) VALUES (?, ?)',
            [customerName, contactNumber]
        );
        connection.release();

        res.status(201).json({
            id: result.insertId,
            customerName,
            contactNumber
        });
    } catch (error) {
        console.error('Error creating customer:', error);
        res.status(500).json({ error: 'Failed to create customer', details: error.message });
    }
});

// Delete customer
app.delete('/api/customers/:id', async (req, res) => {
    if (!isDbReady) {
        return res.status(503).json({ error: 'Database not ready' });
    }

    const { id } = req.params;

    try {
        const connection = await pool.getConnection();
        const [result] = await connection.query('DELETE FROM customers WHERE id = ?', [id]);
        connection.release();

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Customer not found' });
        }

        res.json({ success: true, message: 'Customer deleted successfully' });
    } catch (error) {
        console.error('Error deleting customer:', error);
        res.status(500).json({ error: 'Failed to delete customer', details: error.message });
    }
});


// =========================================
// GET ALL ORDERS
// =========================================
app.get('/api/orders', async (req, res) => {
    if (!isDbReady) {
        return res.status(503).json({ error: 'Database not ready' });
    }

    try {

        const connection = await pool.getConnection();

        const [rows] = await connection.query(`
            SELECT 
                o.*,
                c.customerName,
                c.contactNumber
            FROM orders o
            LEFT JOIN customers c
            ON o.customer_id = c.id
            ORDER BY o.created_at DESC
        `);

        connection.release();

        res.json(rows);

    } catch (error) {

        console.error('Error fetching orders:', error);

        res.status(500).json({
            error: 'Failed to fetch orders'
        });
    }
});
// Get single customer by ID


// Create order
// =========================================
// ADD NEW ORDER
// =========================================
app.post('/api/orders', async (req, res) => {
    try {

        console.log("Incoming order data:");
        console.log(req.body);

        const {
            customer_id,
            service,
            weight,
            totalAmount,
            status
        } = req.body;

        // Validation
        if (!customer_id || !service || !weight || !totalAmount) {
            return res.status(400).json({
                error: 'Missing required fields'
            });
        }

        const connection = await pool.getConnection();

        const [result] = await connection.query(
            `
            INSERT INTO orders
            (customer_id, service, weight, totalAmount, status)
            VALUES (?, ?, ?, ?, ?)
            `,
            [
                customer_id,
                service,
                weight,
                totalAmount,
                status || 'Pending'
            ]
        );

        connection.release();

        res.status(201).json({
            success: true,
            message: 'Order added successfully',
            orderId: result.insertId
        });

    } catch (error) {

        console.error('Error processing order:', error);

        res.status(500).json({
            error: error.message
        });
    }
});

// Get orders by status
app.get('/api/orders/status/:status', async (req, res) => {
    const { status } = req.params;

    if (!isDbReady) {
        return res.status(503).json({ error: 'Database not ready' });
    }

    try {
        const connection = await pool.getConnection();
        const [rows] = await connection.query(
            `
            SELECT
                o.id,
                o.customer_id,
                o.service,
                o.weight,
                o.totalAmount,
                o.status,
                o.created_at,
                c.customerName,
                c.contactNumber
            FROM orders o
            JOIN customers c ON o.customer_id = c.id
            WHERE o.status = ?
            ORDER BY o.created_at DESC
            `,
            [status]
        );
        connection.release();
        res.json(rows);
    } catch (error) {
        console.error('Error fetching orders by status:', error);
        res.status(500).json({ error: 'Failed to fetch orders by status' });
    }
});

// Update order status
app.put('/api/orders/:id/status', async (req, res) => {
    const { status } = req.body;
    
    if (!status) {
        return res.status(400).json({ error: 'Status is required' });
    }

    try {
        const connection = await pool.getConnection();
        const [result] = await connection.query(
            'UPDATE orders SET status = ? WHERE id = ?',
            [status, req.params.id]
        );
        connection.release();
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Order not found' });
        }
        
        res.json({ message: 'Order status updated successfully', status });
    } catch (error) {
        console.error('Error updating order status:', error);
        res.status(500).json({ error: 'Failed to update order status' });
    }
});

// ============= NOTIFICATIONS API =============

// Get all notifications
app.get('/api/notifications', async (req, res) => {
    try {
        const connection = await pool.getConnection();
        const [rows] = await connection.query(`
            SELECT n.*, c.customerName
            FROM notifications n
            JOIN customers c ON n.customer_id = c.id
            ORDER BY n.created_at DESC
        `);
        connection.release();
        res.json(rows);
    } catch (error) {
        console.error('Error fetching notifications:', error);
        res.status(500).json({ error: 'Failed to fetch notifications' });
    }
});

// Create SMS notification using FMC SMS
app.post('/api/notifications', async (req, res) => {
    // Frontend sends: { order_id, customer_id, contactNumber, message }
    // Older backend expected: { order_id, customer_id, phone, message }
    const { order_id, customer_id, phone, contactNumber, message } = req.body;

    // If phone isn't passed correctly, try a customer lookup from DB.
    // This prevents cases where send fails because contactNumber is missing/undefined.
    const resolvedPhone = phone || contactNumber;

    if (!order_id || !customer_id || !resolvedPhone || !message) {
        return res.status(400).json({
            error: 'Missing required fields: order_id, customer_id, phone/contactNumber, message',
            received: {
                order_id,
                customer_id,
                phoneProvided: !!phone,
                contactNumberProvided: !!contactNumber,
                messageProvided: !!message
            }
        });
    }

    try {
        const result = await withConnection(async (connection) => {

            const [orderRows] = await connection.query(
                'SELECT id FROM orders WHERE id = ?',
                [order_id]
            );

            if (!orderRows || orderRows.length === 0) {
                throw new Error(`Order not found for id=${order_id}`);
            }

            // Send SMS through FMC SMS
            await sendSmsFmc({
                to: resolvedPhone,
                message
            });

            // Ensure notifications.html refreshes pending/ready lists immediately
            // by moving the order into Ready state after SMS succeeds.
            // (Some flows also trigger status changes elsewhere, but this is the canonical update.)

            console.log('[FMC SMS] sent OK', { to: resolvedPhone });

            // Save notification record
            const [notificationResult] = await connection.query(
                'INSERT INTO notifications (order_id, customer_id, contactNumber, message, status) VALUES (?, ?, ?, ?, ?)',
                [order_id, customer_id, resolvedPhone, message, 'Sent']
            );

            // Update order status
            // Your notifications.html is split into:
            // - Pending: o.status === 'Pending'
            // - Ready:   o.status === 'Ready'
            // So after sending SMS we must set the order to Ready.
            await connection.query(
                'UPDATE orders SET status = ? WHERE id = ?',
                ['Ready', order_id]
            );

            return notificationResult;
        });

        res.status(201).json({
            success: true,
            id: result.insertId,
            order_id,
            customer_id,
            phone,
            notificationMessage: message,
            status: 'Sent via FMC SMS'
        });

    } catch (error) {
        console.error('SMS Notification Error:', error);

        // surface more structured error details from sendSmsFmc
        res.status(500).json({
            error: 'Failed to send SMS notification',
            details: error && error.message ? error.message : String(error),
            name: error && error.name ? error.name : undefined,
            cause: error && error.cause ? error.cause : undefined
        });
    }
});


// ============= EMAIL API =============
app.post('/api/send-email', async (req, res) => {
    const { email, customerName, message } = req.body;
    
    if (!email || !message) {
        return res.status(400).json({ error: 'Email and message required' });
    }
    
    if (!process.env.EMAIL_USER) {
        return res.status(500).json({ error: 'Email service not configured. Add email credentials to .env' });
    }

    try {
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Laundry Order Notification',
            html: `
                <h2>Order Update</h2>
                <p>Hello ${customerName || 'Valued Customer'},</p>
                <p>${message}</p>
                <br>
                <p>Thank you for using our Laundry Management Service!</p>
                <p><em>This is an automated message, please do not reply to this email.</em></p>
            `
        };

        const info = await transporter.sendMail(mailOptions);
        
        console.log(`Email sent to ${email}: ${info.messageId}`);
        res.json({ 
            message: 'Email sent successfully', 
            messageId: info.messageId,
            email: email 
        });
    } catch (error) {
        // Return structured info to help troubleshoot SMTP failures (no secrets exposed)
        // nodemailer errors typically include `code` and `response`
        const smtpCode = error && error.code ? String(error.code) : undefined;
        const response = error && error.response ? String(error.response) : undefined;

        console.error('Error sending email:', error);
        res.status(500).json({
            error: 'Failed to send email',
            message: error && error.message ? error.message : undefined,
            smtpCode,
            smtpResponse: response
        });
    }
});


// ============= SALES REPORTS API =============

// Get sales summary
app.get('/api/sales/summary', async (req, res) => {
    try {
        const connection = await pool.getConnection();
        const [rows] = await connection.query(`
            SELECT
                COUNT(*) as totalOrders,
                SUM(totalAmount) as totalRevenue,
                AVG(totalAmount) as avgOrderValue,
                SUM(weight) as totalWeight
            FROM orders
        `);
        connection.release();
        res.json(rows[0]);
    } catch (error) {
        console.error('Error fetching sales summary:', error);
        res.status(500).json({ error: 'Failed to fetch sales summary' });
    }
});

// Get sales by service
app.get('/api/sales/by-service', async (req, res) => {
    try {
        const connection = await pool.getConnection();
        const [rows] = await connection.query(`
            SELECT
                service,
                COUNT(*) as orderCount,
                SUM(weight) as totalWeight,
                SUM(totalAmount) as totalRevenue,
                AVG(totalAmount) as avgOrderValue
            FROM orders
            GROUP BY service
            ORDER BY totalRevenue DESC
        `);
        connection.release();
        res.json(rows);
    } catch (error) {
        console.error('Error fetching sales by service:', error);
        res.status(500).json({ error: 'Failed to fetch sales by service' });
    }
});

// Get daily sales
app.get('/api/sales/daily', async (req, res) => {
    try {
        const connection = await pool.getConnection();
        const [rows] = await connection.query(`
            SELECT
                DATE(created_at) as date,
                COUNT(*) as orderCount,
                SUM(weight) as totalWeight,
                SUM(totalAmount) as totalRevenue
            FROM orders
            GROUP BY DATE(created_at)
            ORDER BY date DESC
            LIMIT 30
        `);
        connection.release();
        res.json(rows);
    } catch (error) {
        console.error('Error fetching daily sales:', error);
        res.status(500).json({ error: 'Failed to fetch daily sales' });
    }
});

// Get sales with date filtering
app.get('/api/sales/filtered', async (req, res) => {
    const { dateFrom, dateTo, service } = req.query;

    try {
        let query = `
            SELECT o.*, c.customerName, c.contactNumber
            FROM orders o
            JOIN customers c ON o.customer_id = c.id
            WHERE 1=1
        `;
        const params = [];

        if (dateFrom) {
            query += ' AND DATE(o.created_at) >= ?';
            params.push(dateFrom);
        }

        if (dateTo) {
            query += ' AND DATE(o.created_at) <= ?';
            params.push(dateTo);
        }

        if (service) {
            query += ' AND o.service LIKE ?';
            params.push(`%${service}%`);
        }

        query += ' ORDER BY o.created_at DESC';

        const connection = await pool.getConnection();
        const [rows] = await connection.query(query, params);
        connection.release();
        res.json(rows);
    } catch (error) {
        console.error('Error fetching filtered sales:', error);
        res.status(500).json({ error: 'Failed to fetch filtered sales' });
    }
});

// Health check endpoint for server status
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', uptime: process.uptime(), timestamp: new Date().toISOString() });
});

let isDbReady = false;

async function verifyDbConnection() {
    try {
        const connection = await pool.getConnection();
        await connection.query('SELECT 1');
        connection.release();
        isDbReady = true;
        console.log('✓ MySQL connection verified');
    } catch (error) {
        isDbReady = false;
        console.error('✗ Failed to verify MySQL connection:', error.message || error);
        if (error && error.code === 'ER_BAD_DB_ERROR') {
            console.error('The configured database does not exist. Run `npm run db:init` from the server folder to create it.');
        }
    }
}

// Start server even if DB is not ready (prevents ERR_CONNECTION_REFUSED)
verifyDbConnection().finally(() => {
    console.log('Starting server... DB ready =', isDbReady);
    app.listen(PORT, () => {
        console.log(`✓ Server running on http://localhost:${PORT}`);
    });
});
// ========================================
// SEND SMS USING FMCSMS
// ========================================
