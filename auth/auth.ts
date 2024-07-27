import { NextFunction, Response, Request } from 'express';
import { User } from '@prisma/client';
import jwt, { JwtPayload } from 'jsonwebtoken'
import { generateAccessToken } from '../utils/utils';

export function verify(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  let newAccessToken = null
  if (authHeader) {
    console.log(authHeader)
    const token = authHeader.split(" ")[1];

    jwt.verify(token, "mySecretKey", (err, decoded) => {
      if (err) {
        console.log("*****************  5")

        if (err.name = 'TokenExpiredError') {
          console.log("*****************  6")


         
          
          const refreshToken = req.cookies.refreshToken

          if (refreshToken) { //TODO : CROSS REFERENCE COOKIE WITH DB
            console.log("already logged in user")
            jwt.verify(refreshToken, "myRefreshSecretKey", (err: any, user: any) => {
              console.log("*****************  1")

              newAccessToken = generateAccessToken(user as User);
              req.body.accessToken = newAccessToken;
              (req as any).body.user = user as User;
              console.log("*****************  4")

   
              next();
            })
            

          }else {
            console.log("*****************   2")

            return res.status(403).json("Token expired!"); //this is what forces logged out users going to / in browser to /login

          }

        }else {
          console.log("*****************   3")

          return res.status(403).json("Token is not valid!");

        }
      }else {
        
        (req as any).body.user = decoded as User;
        console.log("*****************   3333")
        next();
      }



      
    });
  } else {
    console.log(req.headers)
    console.log("**************************** 444")

    res.status(401).json("You are not authenticated!");
  }
};
