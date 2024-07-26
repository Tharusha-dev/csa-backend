import jwt from 'jsonwebtoken'

import { User } from '@prisma/client';
export  function generateAccessToken (user:User){
    return jwt.sign({ uid: user.uid, privilegeLevel: user.privilegeLevel }, "mySecretKey", {
      expiresIn: "15m",
    });
  };
  
export function generateRefreshToken(uid:number,privilegeLevel:number) {
    return jwt.sign({ uid, privilegeLevel }, "myRefreshSecretKey");
  };