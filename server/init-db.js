const fs = require('fs/promises');
const path = require('path');
const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

const envPath = path.resolve(__dirname, '.env');
dotenv.config({ path: envPath });

const {
  DB_HOST = 'localhost',
  DB_USER,
  DB_PASSWORD,
  DB_PORT = '3306',
  DB_NAME = 'laundry_management'
} = process.env;

async function run() {
  if (!DB_USER) {
    throw new Error('DB_USER is not set in server/.env');
  }

  const sqlPath = path.resolve(__dirname, 'database.sql');
  const sql = await fs.readFile(sqlPath, 'utf8');

  const connection = await mysql.createConnection({
    host: DB_HOST,
    user: DB_USER,
    password: DB_PASSWORD,
    port: Number(DB_PORT),
    multipleStatements: true,
    supportBigNumbers: true,
    bigNumberStrings: true
  });

  console.log(`Connected to MySQL server at ${DB_HOST}:${DB_PORT}`);
  console.log(`Rebuilding database '${DB_NAME}' from ${sqlPath}...`);

  await connection.query(`DROP DATABASE IF EXISTS \`${DB_NAME}\``);
  await connection.query(sql);
  await connection.end();

  console.log(`Database '${DB_NAME}' has been created or verified successfully.`);
  console.log('Tables have been created/verified successfully.');
  console.log('You can now start the server with: npm start');
}

run().catch((error) => {
  console.error('Database initialization failed:');
  console.error(error.message || error);
  process.exit(1);
});
