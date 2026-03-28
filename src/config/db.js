const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  console.error('Unexpected DB error:', err.message);
});

pool.connect()
  .then(client => {
    console.log('PostgreSQL connected ✅');
    client.release();
  })
  .catch(err => console.error('PostgreSQL connection error ❌', err));

module.exports = pool;