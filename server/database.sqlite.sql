-- SQLite schema for Laundry Management System

-- Create customers table
CREATE TABLE IF NOT EXISTS customers (
    customerID INT AUTO_INCREMENT PRIMARY KEY, -- Auto increment ID

    customerName VARCHAR(255) NOT NULL, -- Customer full name

    contactNumber VARCHAR(20) NOT NULL, -- Customer contact number

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP -- Date created
);

-- Orders Table
CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER NOT NULL,
    service TEXT NOT NULL,
    weight REAL NOT NULL,
    totalAmount REAL NOT NULL,
    status TEXT DEFAULT 'Pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
);

-- Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL,
    customer_id INTEGER NOT NULL,
    contactNumber TEXT NOT NULL,
    message TEXT NOT NULL,
    status TEXT DEFAULT 'Sent',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_customer_contact ON customers(contactNumber);
CREATE INDEX IF NOT EXISTS idx_order_customer ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_order_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_notification_customer ON notifications(customer_id);
