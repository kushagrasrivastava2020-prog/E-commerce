const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
require('dotenv').config();

const FILES = ['schema.sql', 'seed.sql', 'reccomendation_schema.sql'];

const useConnectionString = !!process.env.DATABASE_URL;
const wantsSsl =
  useConnectionString ||
  process.env.PGSSL === 'true' ||
  process.env.NODE_ENV === 'production';

const clientConfig = useConnectionString
  ? { connectionString: process.env.DATABASE_URL }
  : {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME || 'ecommerce_db',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
    };

if (wantsSsl) clientConfig.ssl = { rejectUnauthorized: false };

(async () => {
  const client = new Client(clientConfig);
  await client.connect();
  console.log('Connected. Applying SQL files...');

  for (const file of FILES) {
    const fullPath = path.join(__dirname, '..', 'database', file);
    if (!fs.existsSync(fullPath)) {
      console.warn(`Skipping ${file} (not found)`);
      continue;
    }
    const sql = fs.readFileSync(fullPath, 'utf8');
    console.log(`→ ${file} (${sql.length} bytes)`);
    await client.query(sql);
  }

  await client.end();
  console.log('Done.');
})().catch((err) => {
  console.error('db-setup failed:', err.message);
  process.exit(1);
});
