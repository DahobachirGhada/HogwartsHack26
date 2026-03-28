require('dotenv').config();
const pool = require('../src/config/db.js');

const algiersCities = [
  "Alger Centre", "Sidi M'Hamed", "El Madania", "Belouizdad", "Bab El Oued",
  "Bologhine", "Casbah", "Oued Koriche", "Bir Mourad Raïs", "El Biar",
  "Bouzareah", "Birkhadem", "El Harrach", "Baraki", "Oued Smar",
  "Bachdjerrah", "Hussein Dey", "Kouba", "Bourouba", "Dar El Beida",
  "Bab Ezzouar", "Ben Aknoun", "Dely Ibrahim", "Hammamet", "Rais Hamidou",
  "Djasr Kasentina", "El Mouradia", "Hydra", "Mohammadia", "Bordj El Kiffan",
  "El Magharia", "Beni Messous", "Les Eucalyptus", "Birtouta", "Tessala El Merdja",
  "Ouled Chebel", "Sidi Moussa", "Ain Taya", "Bordj El Bahri", "El Marsa",
  "H'raoua", "Rouiba", "Reghaïa", "Ain Benian", "Staoueli",
  "Zeralda", "Mahelma", "Rahmania", "Souidania", "Cheraga",
  "Ouled Fayet", "El Achour", "Draria", "Saoula", "Shabat El Ameur",
  "Douera", "Baba Hassen", "Khraicia"
];

const delay = ms => new Promise(r => setTimeout(r, ms));

async function seed() {
  console.log('Starting quartiers seeding...');

  for (const city of algiersCities) {
    try {
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(city + ', Alger, Algeria')}&format=json&limit=1`;
      const res = await fetch(url, {
        headers: { 'User-Agent': 'SafeCity-Hackathon/1.0' }
      });
      const data = await res.json();

      if (data[0]) {
        await pool.query(
          `INSERT INTO quartiers (nom, lat, lng) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
          [city, parseFloat(data[0].lat), parseFloat(data[0].lon)]
        );
        console.log(`✅ ${city} → ${data[0].lat}, ${data[0].lon}`);
      } else {
        console.warn(`⚠️  Not found: ${city}`);
      }

      await delay(1100); // Respect Nominatim rate limit (1 req/sec)
    } catch (err) {
      console.error(`❌ Error for ${city}:`, err.message);
    }
  }

  console.log('✅ Seeding done!');
  process.exit(0);
}

seed();