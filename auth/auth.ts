// This is the middlewhere which does all the token verification and refreshing processes.

import { NextFunction, Response, Request } from 'express';
import { User } from '@prisma/client';
import jwt, { JwtPayload } from 'jsonwebtoken'
import { generateAccessToken } from '../utils/utils';


export function verify(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  let newAccessToken = undefined //if access token does not need to be reniwed then access token is send to the client as undefined.
  
    console.log(authHeader)


    const token = authHeader!.split(" ")[1];

    jwt.verify(token, "mySecretKey", async (err, decoded) => {
      if (err) { //Either access token is missing or expired or invalid


        if (err.name = 'TokenExpiredError') { // Checks whether token is null or expired, i dont know why null gets through this check but it works that way :)
          
          const refreshToken = req.cookies.refreshToken

          if (refreshToken) { //(ref:1)



            jwt.verify(refreshToken, "myRefreshSecretKey", (err: any, user: any) => { //check if the refresh token is valid and decode the user from the refresh token

              newAccessToken = generateAccessToken(user as User); //new access token is generated. Since user is decoded from the refresh token this new access token can only access resorces accessable by the user
              req.body.accessToken = newAccessToken;
              (req as any).body.user = user as User;

   
              next();
            })
            

          }else {

            return res.status(403).json("Token expired!"); //this is what redirects logged out users going to /  to /login (ref:2)

          }

        }else {

          return res.status(403).json("Token is not valid!");

        }
      }else { //access token does not need refreshing and is valid. 
        
        (req as any).body.user = decoded as User;
        next();
      }



      
    });
  
};
