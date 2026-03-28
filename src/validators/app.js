require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json());
app.use('/api/auth', require('../routes/authRoutes.js'));
app.use('/api',      require('../routes/chatRoutes.js'));
app.get('/', (req, res) => res.json({ message: 'SafeCity API running ' }));

module.exports = app;