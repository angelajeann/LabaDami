# Laundry Management System - Setup Guide

## Overview
This laundry management system uses Node.js/Express backend with MySQL database to store customer information, orders, and notifications.

---

## Prerequisites
- **MySQL**: Make sure MySQL is installed and running
- **Node.js**: Version 12 or higher
- **npm**: Comes with Node.js

---

## Setup Instructions

### Step 1: Import Database Schema
1. Open **MySQL Command Line** or **phpMyAdmin**
2. Copy and paste the contents of `server/database.sql`
3. Execute the SQL to create the database and tables

**Alternative (Command Line):**
```bash
mysql -u root -p < server/database.sql
```

### Step 2: Configure Database Connection & Email
Edit `server/.env` file and update the credentials:

**Database Configuration:**
```
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=laundry_management
DB_PORT=3306
SERVER_PORT=3002
```

**Email Configuration (for Notifications):**
```
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
```

> **For Gmail Users**: You need to generate an "App Password" instead of using your regular password:
> 1. Go to https://support.google.com/accounts/answer/185833
> 2. Enable 2-Step Verification first if not already enabled
> 3. Create an App Password for your application
> 4. Use this App Password in the EMAIL_PASS field

### Step 3: Install Dependencies
Open a terminal in the `server` folder and run:
```bash
cd server
npm install
```

### Step 4: Start the Server
```bash
cd server
npm start
```

Or for development with auto-reload:
```bash
npm run dev
```

You should see:
```
✓ Laundry Management Server running on http://localhost:3002
✓ API endpoints available at http://localhost:3002/api
```

### Quick Run Checklist
1. Open a terminal in `laundry_management_system/server`
2. Run `npm install` if you haven’t already
3. Import the database schema:
   ```bash
   mysql -u root -p < database.sql
   ```
4. Start the server with `npm start`
5. Confirm the backend is healthy:
   - `http://localhost:3002/api/health`

> If you open HTML files directly in the browser, use pages like `add_order.html`, `orders.html`, and `sales_report.html` from the project root.

---

## Database Schema

### Customers Table
- `id`: Primary key (Auto-increment)
- `customerName`: Customer's full name
- `contactNumber`: Phone number (Unique)
- `email`: Customer's email address (Optional, for notifications)
- `created_at`: Timestamp of creation
- `updated_at`: Timestamp of last update

### Orders Table
- `id`: Primary key (Auto-increment)
- `customer_id`: Foreign key to customers
- `service`: Type of service (Wash, Dry Cleaning, etc.)
- `weight`: Weight of laundry in kg
- `totalAmount`: Calculated total cost
- `status`: Order status (Pending, Processing, Ready, Picked Up, On Hold)
- `created_at` & `updated_at`: Timestamps

### Notifications Table
- `id`: Primary key (Auto-increment)
- `order_id`: Foreign key to orders
- `customer_id`: Foreign key to customers
- `contactNumber`: Customer's phone number
- `message`: Notification message sent
- `status`: Static 'Sent' for now
- `created_at`: When notification was sent

---

## API Endpoints

### Customers
- `GET /api/customers` - Get all customers
- `GET /api/customers/:id` - Get specific customer
- `POST /api/customers` - Create new customer
  - Body: `{ customerName, contactNumber, email }`

### Orders
- `GET /api/orders` - Get all orders with customer details
- `GET /api/orders/status/pending` - Get pending/processing orders
- `POST /api/orders` - Create new order
  - Body: `{ customer_id, service, weight, totalAmount }`
- `PUT /api/orders/:id/status` - Update order status
  - Body: `{ status }`

### Notifications
- `GET /api/notifications` - Get all notifications sent
- `POST /api/notifications` - Save notification
  - Body: `{ order_id, customer_id, contactNumber, message }`
- `POST /api/send-email` - Send email notification
  - Body: `{ email, customerName, message }`

---

## Workflow

### Adding an Order
1. User enters customer details (name, contact)
2. Selects service and weight
3. System calculates cost
4. Order is saved to database with customer details
5. If customer already exists (same contact number), existing customer is used

### Sending Notifications
1. Staff views pending orders in Notifications page
2. Selects order and clicks "Notify"
3. Modal opens with customer details
4. Staff can customize message or use default
5. Notification email is sent to customer's email address
6. Notification is saved to database for record keeping
7. Order status automatically changes to "Ready"

> **Note**: Ensure customers have email addresses in their profiles for notifications to work.

### Managing Order Status
- Staff can update order status using dropdown (Pending, Processing, Ready, Picked Up, On Hold)
- Status changes are saved to database immediately

---

## Troubleshooting

### Server Connection Error
- Make sure server is running on port 3002
- Check if MySQL is running
- Verify `.env` file database credentials

### Database Connection Failed
- Verify MySQL is installed and running
- Check username and password in `.env`
- Ensure database was created successfully
### Existing Database Migration
If you already have an older version of the database where `orders.totalAmount` was stored as text with a rupee sign, run this in MySQL before starting the server:
```sql
UPDATE orders
SET totalAmount = TRIM(REPLACE(totalAmount, '₹', ''))
WHERE totalAmount LIKE '₹%';

ALTER TABLE orders
MODIFY totalAmount DECIMAL(10,2) NOT NULL;
```
### Orders Not Showing
- Check if customers were created first
- Verify order status is 'Pending' or 'Processing'
- Check browser console for API errors

### CORS Errors
- Server is configured to accept requests from all origins
- If still having issues, check if requests are using `http://localhost:3002`

---

## File Locations
```
laundry_management_system/
├── server/
│   ├── server.js (Main Express server)
│   ├── package.json (Dependencies)
│   ├── .env (Database config)
│   └── database.sql (Schema)
├── add_order.html (Add orders - uses API)
├── notifications.html (Manage notifications - uses API)
└── style.css
```

---

## Notes
- The system uses localStorage for client-side calculations but persists all data to MySQL
- Customer contact numbers must be unique
- All timestamps are in local timezone
- Frontend API calls use `http://localhost:3002/api` endpoint

---

## Future Enhancements
- SMS gateway integration (optional)
- Payment gateway integration
- Admin dashboard with advanced analytics
- Order tracking history with status timeline
- Multiple staff user accounts with role-based permissions
- Customer portal for tracking their own orders
