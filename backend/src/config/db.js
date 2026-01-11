const { drizzle } = require("drizzle-orm/mysql2");
const mysql = require("mysql2/promise");

let connectionPool = null;
let db = null;

async function createConnection() {
  try {
    const pool = mysql.createPool({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      port: process.env.DB_PORT || 3306,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 100,
      enableKeepAlive: true,
      keepAliveInitialDelay: 0
    });

    const testConnection = await pool.getConnection();
    await testConnection.ping();
    testConnection.release();

    connectionPool = pool;
    db = drizzle(pool);

    return { connection: pool, db };

  } catch (error) {
    console.error("Failed to connect to database:", error.message);
    throw error;
  }
}

async function getDb() {
  if (!db || !connectionPool) {
    await createConnection();
  }
  return db;
}

async function getConnection() {
  if (!connectionPool) {
    await createConnection();
  }
  return connectionPool;
}

async function testConnection() {
  try {
    const pool = await getConnection();
    const testConn = await pool.getConnection();
    await testConn.ping();
    const threadId = testConn.threadId;
    testConn.release();
    console.log('Database connected');
    return true;
  } catch (error) {
    console.error("Database connection test failed:", error.message);
    return false;
  }
}

async function closeConnection() {
  if (connectionPool) {
    await connectionPool.end();
    connectionPool = null;
    db = null;
    console.log("Database connection pool closed.");
  }
}

module.exports = {
  getDb,
  getConnection,
  testConnection,
  closeConnection
};
