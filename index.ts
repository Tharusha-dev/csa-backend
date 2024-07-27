import express from 'express'
import jwt from 'jsonwebtoken'
import { generateAccessToken, generateRefreshToken } from './utils/utils'
import { verify } from './auth/auth'
import { prisma } from './db/prisma'
import { User } from '@prisma/client'
import cors from 'cors'
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser'



const app = express();
app.use(cookieParser())
dotenv.config();

const PORT = process.env.PORT || 5000;



app.use(express.json());
app.use(cors({
  origin: 'http://localhost:3000', // Allow only your React app's origin
  credentials: true,
}))



let refreshTokens: String[] = [];

app.post("/api/refresh", (req, res) => {
  //take the refresh token from the user
  const refreshToken = req.body.token;

  //send error if there is no token or it's invalid
  if (!refreshToken) return res.status(401).json("You are not authenticated!");
  if (!refreshTokens.includes(refreshToken)) {
    return res.status(403).json("Refresh token is not valid!");
  }
  jwt.verify(refreshToken, "myRefreshSecretKey", (err: any, user: any) => {
    err && console.log(err);
    refreshTokens = refreshTokens.filter((token) => token !== refreshToken);

    const newAccessToken = generateAccessToken(user);
    const newRefreshToken = generateRefreshToken(user.uid, user.privilegeLevel);

    refreshTokens.push(newRefreshToken);

    res.status(200).json({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    });
  });

  //if everything is ok, create new access token, refresh token and send to user
});

app.post("/api/admin/modify-shipment/", verify, async (req, res) => {
  const { user, sid, status } = req.body
  console.log("got to mod")
  console.log(req.body)
 
    try {
      await prisma.shipments.update({
        where: { sid: sid },
        data: { status: status }
      })
    } catch (err) {
      res.send(403).json(err)
    }

  

})

app.get("/api/admin/all-shipments", verify, async (req, res) => {
  // console.log("got")
  // const { user } = req.body

  // if (user.privilegeLevel > 0) {
  //   try {
  //     let accessToken = req.body.accessToken
  //     const shipments = await prisma.shipments.findMany()
  //     console.log(shipments)

  //     res.send(200).json({shipments,accessToken})
  //   } catch (err) {
  //    console.log(err)
  //   }

  // }else {
  //   res.send(403).json("Your not allowd to performe this action")
  // }


  try {
    const shipments = await prisma.shipments.findMany({
     

    })
    let accessToken = req.body.accessToken

    res.status(200).json({
      accessToken,
      shipments
    })

  } catch (err) {
    console.log(err)
  }
})



app.post("/api/login", async (req, res) => {
  const { username, password } = req.body;

  let user: User | null


  try {
    user = await prisma.user.findUnique({
      where: { email: username }
    })


    if (user) {
      if (await bcrypt.compare(password, user.password)) {
        console.log(password)
        console.log(user.password)

        //Generate an access token
        const accessToken = generateAccessToken(user);
        const refreshToken = generateRefreshToken(user.uid, user.privilegeLevel);

        try {
          await prisma.user.update({
            where: { uid: user.uid },
            data: { refreshToken: refreshToken }
          });
        } catch (err) {
          res.status(500).json(err)
        }
        // Set refresh token as HttpOnly cookie
        res.cookie('refreshToken', refreshToken, {
          httpOnly: true,
          secure: true, // Use secure in production
          sameSite: 'strict',
          maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
        });



        res.json({
          username: user.email,
          privilegeLevel: user.privilegeLevel,
          accessToken,

        });
      } else {
        console.log(password)
        console.log(user.password)
        res.status(400).json("Username or password incorrect!");
      }
    } else {
      res.status(400).json("Username does not exsist");
    }


    return null
  } catch (error) {
    console.error('Error verifying user:', error)

  }

});


app.post("/api/signup", async (req, res) => {
  const { firstName, lastName, username, password } = req.body;

  // Generate a salt
  const salt = await bcrypt.genSalt(10);

  // Hash the password
  const hashedPassword = await bcrypt.hash(password, salt);




  try {
    await prisma.user.create({
      data: {

        email: username,
        fname: firstName,
        lname: lastName,
        password: hashedPassword,
        privilegeLevel: 0,



      }
    }).then((e) => {
      res.status(200).json("New user created")

    })
  } catch (err) {
    res.status(500).json(err)
  }


})


app.delete("/api/users/:userId", verify, (req: any, res) => {
  if (req.user.uid === req.params.userId || req.user.isAdmin) {
    res.status(200).json("User has been deleted.");
  } else {

    res.status(403).json(req.user);
  }
});

app.post("/api/logout", (req, res) => {

  //TODO : REMOVE COOKIE FROM DB


  res.clearCookie("refreshToken")
  res.status(200).json("You logged out successfully.");
});

app.post("/api/verify", verify, (req, res) => {
  if (!res.headersSent) {
    res.send(200)
  }

})

app.post("/api/new-shipment", verify, async (req: any, res) => {

  const { user, recipient_name, recipient_address } = req.body


  try {
    const sender = await prisma.user.findUnique({
      where: {
        uid: user.uid
      }

    })



    try {

      await prisma.shipments.create({
        data: {
          senderUid: sender!.uid,
          recipient_name: recipient_name,
          recipient_address: recipient_address,
          status: "pending",



        }
      }).then((e) => {
        res.status(200).json("New shipment created")

      })
    } catch (err) {
      console.log(err)
    }

  } catch (err) {
    res.status(500).json(err)
  }

})

app.post("/api/shipping-details",verify, async (req: any, res) => {
  const {user,sid} = req.body
  try {
    const shipment = await prisma.shipments.findUnique({
      //@ts-ignore
      where: {
        AND: [
          { sid:sid},
          { senderUid: user.uid }
        ]
      }
      
    })

    res.status(200).json(shipment)
  }catch(err){
    res.status(400).json(err)
  }
} )



app.get("/api/all-shipments", verify, async (req: any, res) => {

  try {
    const shipments = await prisma.shipments.findMany({
      where: {
        senderUid: req.body.user.uid
      }

    })
    let accessToken = req.body.accessToken
    let privilegeLevel = req.body.user.privilegeLevel

    res.status(200).json({
      accessToken,
      shipments,
      privilegeLevel
    })

  } catch (err) {
    console.log(err)
  }



})



app.listen(PORT, () => {

  console.log(`server running on ${PORT}`)

});


