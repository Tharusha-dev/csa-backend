import express from 'express'
import jwt from 'jsonwebtoken'
import { generateAccessToken, generateRefreshToken } from './utils/utils'
import { verify } from './auth/auth'
import { prisma } from './db/prisma'
import { User } from '@prisma/client'
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';



const app = express();
dotenv.config();

const PORT = process.env.PORT || 5000;



app.use(express.json());



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



app.post("/api/login", async (req, res) => {
  const { username, password } = req.body;

  let user: User | null


  try {
    user = await prisma.user.findUnique({
      where: { email: username }
    })


    if (user) {
      if (await bcrypt.compare(password, user.password)) {
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


        res.json({
          username: user.email,
          privilegeLevel: user.privilegeLevel,
          accessToken,
          refreshToken,
        });
      } else {
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

app.post("/api/logout", verify, (req, res) => {
  const refreshToken = req.body.token;
  refreshTokens = refreshTokens.filter((token) => token !== refreshToken);
  res.status(200).json("You logged out successfully.");
});

app.post("/api/new-shipment", verify, async (req: any, res) => {

  try {
    const user = await prisma.user.findUnique({
      where: {
        uid: req.user.uid
      }

    })

    try {

      await prisma.shipments.create({
        data: {
          senderUid: user!.uid,
          recipient_name: "",
          recipient_address: "",
          status: "donw",



        }
      }).then((e) => {
        res.status(200).json("New shipment created")

      })
    } catch (err) {
      res.status(500).json(err)
    }

  } catch (err) {
    res.status(500).json(err)
  }

})



app.get("/api/all-shipments", verify, async (req: any, res) => {

  try {
    const shipments = await prisma.shipments.findMany({
      where: {
        senderUid: req.user.uid
      }

    })


  } catch (err) {
    res.status(500).json(err)
  }

})

app.listen(PORT, () => {

  console.log(`server running on ${PORT}`)

});


