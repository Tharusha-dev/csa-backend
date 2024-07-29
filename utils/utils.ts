import jwt from 'jsonwebtoken'

import { User } from '@prisma/client';
export function generateAccessToken(user: User) {
  return jwt.sign({ uid: user.uid, privilegeLevel: user.privilegeLevel }, "mySecretKey", {
    expiresIn: "30m", // access token expire quickly
  });
};

export function generateRefreshToken(uid: number, privilegeLevel: number) {
  return jwt.sign({ uid, privilegeLevel }, "myRefreshSecretKey",{
    expiresIn: "3dd", // while refresh token are meant to last longer. This means every user MUST re-login once every 30 days.
  });
};

