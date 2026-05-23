import mysql from 'mysql2/promise';

const globalForDb = globalThis as unknown as {
  pool: mysql.Pool | undefined;
};

export const pool =
  globalForDb.pool ??
  mysql.createPool({
    uri: process.env.DATABASE_URL,
    waitForConnections: true,
    connectionLimit: 3,
    queueLimit: 0,
  });

if (process.env.NODE_ENV !== 'production') {
  globalForDb.pool = pool;
}
