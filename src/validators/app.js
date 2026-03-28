import express from 'express';
import cors from 'cors'; 
import passport from '../config/passport.js';
import authRoutes from '../routes/authRoutes.js';
import adminRoutes from '../routes/adminroutes.js';

const app = express();
app.use(cors());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(passport.initialize());

app.use('/auth', authRoutes);
app.use('/admin', adminRoutes);

app.get('/', (req, res) => {
  res.json({ message: "ZeroWaste server is running" });
});

export default app;