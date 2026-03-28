import jwt from 'jsonwebtoken';
import RefreshToken from '../models/refresh_tokenmodel.js';

const generateTokens = async (userId) => {
 
  const accessToken = jwt.sign(
    { id: userId },
    process.env.JWT_SECRET,
    { expiresIn: '15m' }
  );

 
  const refreshToken = jwt.sign(
    { id: userId },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: '7d' }
  );

 
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); 
  await RefreshToken.create(userId, refreshToken, expiresAt);

  return { accessToken, refreshToken };
};

export default generateTokens;