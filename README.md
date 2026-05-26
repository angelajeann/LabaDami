# Laundry Management System

## Quick Start

1. Open a terminal in the project root:
   ```bash
   cd C:\Users\ideapad-slim-3\Desktop\laundry_management_system\server
   ```
2. Install Node dependencies:
   ```bash
   npm install
   ```
3. Import the MySQL schema:
   ```bash
   mysql -u root -p < database.sql
   ```
   Or run the automated initializer from the server folder:
   ```bash
   npm run db:init
   ```
4. Configure database settings in `server/.env`.
5. Start the backend server:
   ```bash
   npm start
   ```
6. Confirm the backend is running:
   - Open `http://localhost:3002/api/health`

## Recommended Pages

- `add_order.html`
- `orders.html`
- `notifications.html`
- `sales_report.html`

## Notes

- The backend runs on port `3002`.
- The database name is `laundry_management`.
- If you have existing orders stored with `₹` in `totalAmount`, run this migration in MySQL before starting the server:
  ```sql
  UPDATE orders
  SET totalAmount = TRIM(REPLACE(totalAmount, '₹', ''))
  WHERE totalAmount LIKE '₹%';

  ALTER TABLE orders
  MODIFY totalAmount DECIMAL(10,2) NOT NULL;
  ```

## Server Files

- `server/server.js` - Backend Express app
- `server/.env` - Environment configuration
- `server/database.sql` - Database schema
