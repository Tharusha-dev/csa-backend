import { NextFunction, Response, Request } from 'express';
import { User } from '@prisma/client';
import jwt, {JwtPayload} from 'jsonwebtoken'

export  function verify (req:Request, res:Response, next:NextFunction){
    const authHeader = req.headers.authorization;
    if (authHeader) {
      const token = authHeader.split(" ")[1];
  
      jwt.verify(token, "mySecretKey", (err, decoded) => {
        if (err) {
          return res.status(403).json("Token is not valid!");
        }
  
        (req as any).user = decoded as User;
        next();
      });
    } else {
      res.status(401).json("You are not authenticated!");
    }
  };
