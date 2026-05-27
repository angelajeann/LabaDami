# Laundry Management System - Sales Report Setup

## ✅ What's Been Implemented

### Database Integration
- **MySQL Database**: Orders are now stored in MySQL instead of localStorage
- **Customer Management**: Customers are created/updated automatically
- **Order Persistence**: All orders are permanently stored in database

### Sales Report Features
- **Real-time Analytics**: Live data from MySQL database
- **Summary Cards**: Total orders, revenue, average order value, total weight
- **Service Breakdown**: Sales analysis by laundry service type
- **Date Filtering**: Filter reports by date range
- **Service Filtering**: Filter by specific service types
- **Recent Orders**: Last 20 orders with customer details
- **Daily Sales**: Daily sales summary for the last 30 days

### API Endpoints Added
- `GET /api/sales/summary` - Overall sales statistics
- `GET /api/sales/by-service` - Sales grouped by service type
- `GET /api/sales/daily` - Daily sales data
- `GET /api/sales/filtered` - Filtered orders with date/service criteria

## 🚀 How to Use

### 1. Database Setup
```sql
-- Run this in MySQL:
SOURCE server/database.sql;
```

### 2. Install Dependencies
```bash
cd server
npm install
```

### 3. Configure Database
Edit `server/.env`:
```
DB_USER=your_mysql_username
DB_PASSWORD=your_mysql_password
```

### 4. Start Server
```bash
cd server
npm install
npm start
```

### 5. Access Sales Report
- Open `sales_report.html` in browser
- Server must be running on port 3002
- Data loads automatically from database

### Quick Run Steps
1. Open a terminal in `laundry_management_system/server`
2. Run `npm install`
3. Make sure MySQL is running
4. Run `npm start`
5. Confirm the backend via `https://labadami.onrender.com/api/health`

## 📊 Sales Report Features

### Filters
- **Date Range**: Select from/to dates
- **Service Type**: Filter by Wash, Dry Cleaning, Ironing, etc.
- **Refresh**: Manual refresh button

### Summary Cards
- **Total Orders**: Count of all orders
- **Total Revenue**: Sum of all order amounts
- **Average Order Value**: Revenue ÷ Orders
- **Total Weight**: Sum of all laundry weights

### Tables
- **Sales by Service**: Revenue breakdown by service type
- **Recent Orders**: Last 20 orders with customer details
- **Daily Sales**: Daily totals for last 30 days

## 🔄 Data Flow

1. **Add Order** → Saves to MySQL database
2. **Sales Report** → Fetches from MySQL via API
3. **Real-time Updates** → Data refreshes on page load/filter change

## 📱 Responsive Design

- Works on desktop, tablet, and mobile
- Tables scroll horizontally on small screens
- Filter controls stack vertically on mobile

## 🛠️ Troubleshooting

### "Failed to load sales data"
- Check if server is running: `https://labadami.onrender.com/api/health`
- Verify MySQL connection in `server/.env`
- Check browser console for detailed errors

### No data showing
- Add some orders first using `add_order.html`
- Ensure server is running and connected to database
- Check if orders were saved successfully

### Date filtering not working
- Use YYYY-MM-DD format for dates
- Check if orders have valid created_at timestamps

## 📈 Future Enhancements

- Export reports to PDF/Excel
- Charts and graphs visualization
- Monthly/yearly reports
- Customer analytics
- Profit margin calculations
- Staff performance tracking