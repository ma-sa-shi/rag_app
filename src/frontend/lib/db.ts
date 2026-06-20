import mysql from 'mysql2/promise';
import { mysqlEnvVars } from '@/lib/env';

const globalForDb = globalThis as unknown as {
  pool: mysql.Pool | undefined;
};

export const pool =
  globalForDb.pool ??
  mysql.createPool({
    host: mysqlEnvVars.host,
    port: mysqlEnvVars.port,
    user: mysqlEnvVars.user,
    password: mysqlEnvVars.password,
    database: mysqlEnvVars.database,
    waitForConnections: true,
    connectionLimit: 3,
    queueLimit: 0,
    timezone: '+09:00',
  });

if (process.env.NODE_ENV !== 'production') {
  globalForDb.pool = pool;
}
