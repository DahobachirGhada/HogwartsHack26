require('dotenv').config();
const { neon } = require('@neondatabase/serverless');

const sql = neon(process.env.DATABASE_URL);

const getLatestThree = async (req, res) => {
  try {
    const rows = await sql`
      SELECT *
      FROM zones_danger
      ORDER BY id DESC
      LIMIT 3
    `;

    res.status(200).json(rows);
  } catch (error) {
    console.error('Error fetching latest rows:', error);
    res.status(500).json({ error: 'Failed to fetch latest rows' });
  }
};

module.exports = { getLatestThree };