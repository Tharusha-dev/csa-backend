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
  origin: 'http://localhost:3000',
  credentials: true,
}))

// see comments on auth/auth.ts to understand verify middlewheres logic




app.post("/api/admin/modify-shipment/", verify, async (req, res) => {

  

  const { user, sid, status,accessToken } = req.body

  if (user.privilegeLevel > 0) { //checking if admin user
    try {
      await prisma.shipments.update({
        where: { sid: sid },
        data: { status: status }
      }).then((e) => {
        res.status(200).send({
          "message":"Changes applied",
        accessToken})
      })
    } catch (err) {
      res.send(403).json(err)
    }



  }
}
)

app.get("/api/admin/all-shipments", verify, async (req, res) => {
  const { user } = req.body

  if (user.privilegeLevel > 0) { //checking if admin user
    try {

      const shipments = await prisma.shipments.findMany({
        include: {
          sender: {
            select: {
              fname: true,
              lname: true,
              address: true,
            },
          },
        },

      })
      let accessToken = req.body.accessToken

      res.status(200).json({
        accessToken,
        shipments
      })

    } catch (err) {
      console.log(err)
    }
  }

})

app.post("/api/admin/shipping-details", verify, async (req: any, res) => { //special admin route admin can change all shippings

  const { user, sid, accessToken } = req.body

  if(user.privilegeLevel > 0) { //admin user check
    try {
  
      const shipment = await prisma.shipments.findUnique({
        where: {
          sid: sid,
        },
        include: {
          sender: {
            select: {
              fname: true,
              lname: true,
              address: true,
            },
          },
        },
      });
  
      res.status(200).json({ shipment, accessToken })
    } catch (err) {
  
      res.status(400).json(err)
    }
  }


})



app.post("/api/login", async (req, res) => {
  const { username, password } = req.body;
  console.log(req.body)

  let user: User | null //if user is null, user does not exsist in db


  try {
    user = await prisma.user.findUnique({
      where: { email: username }
    })


    if (user) {
      if (await bcrypt.compare(password, user.password)) {
        console.log("correct")
        console.log(password)
        console.log(user.password)

        //Generate an access token & refresh token
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
        // Set refresh token as HttpOnly cookie, (only accesible via requests)
        res.cookie('refreshToken', refreshToken, {
          httpOnly: true,
          secure: true,
          sameSite: 'strict',
          maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
        });



        res.json({
          username: user.email,
          privilegeLevel: user.privilegeLevel,
          accessToken,

        });
      } else {
        console.log("in-correct")

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

app.post("/api/profile-info", verify, async (req, res) => {
  const { user, accessToken } = req.body


  try {
    const userInfo = await prisma.user.findUnique({
      where: {
        uid: user.uid
      }

    })
    // prisma does not a have built-in way to exclude a field yet! https://github.com/prisma/prisma/issues/5042 
    // instead password is obfuscate before sendning to client

    userInfo!.password = "_"

    res.status(200).json({
      userInfo,
      accessToken
    })
  } catch (err) {
    res.status(400).json(err)
  }

})

app.post("/api/change-address", verify, async (req, res) => {
  const { user, address,accessToken } = req.body
  try {
    await prisma.user.update({
      where: { uid: user.uid },
      data: { address: address }
    }).then((e) => {
      res.status(200).json({
        
        "message" : "Changes saved",
      accessToken})
    })


  } catch (err) {
    res.status(400).json(err)

  }
})


app.post("/api/signup", async (req, res) => {
  const { firstName, lastName, username, password, address } = req.body;

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
        address: address




      }
    }).then((e) => {
      console.log(hashedPassword)
      res.status(200).json("New user created " + hashedPassword)

    })
  } catch (err) {
    res.status(500).json(err)
  }


})




app.post("/api/logout", (req, res) => {

  res.clearCookie("refreshToken") //so that the next time verify middlewhere gets called ref:1 in /auth/auth.ts will fail.
  res.status(200).json("You logged out successfully.");
});



app.post("/api/new-shipment", verify, async (req: any, res) => {

  const { user, recipient_name, recipient_address , accessToken} = req.body


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
          status: "Pending",



        }
      }).then((e) => {
        res.status(200).json({
          "message" :"New shipment created",
        accessToken})
          
      })
    } catch (err) {
      console.log(err)
    }

  } catch (err) {
    res.status(500).json(err)
  }

})

app.post("/api/shipping-details", verify, async (req: any, res) => {

  const { user, sid, accessToken } = req.body

  try {
    const shipment = await prisma.shipments.findFirst({

      where: {
        AND: [
          { sid: sid },
          { senderUid: user.uid }
        ]
      }

    })

    res.status(200).json({ shipment, accessToken })
  } catch (err) {

    res.status(400).json(err)
  }
})






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
 
app.post("/api/verify", verify, (req, res) => {

  //this is a special endpoint that gets called when user visits / on client. if refresh token exsists 
  //on users cookie that means he is a logged in user. If so the ref:1 on /auth/auth.ts will pass and status 200 will 
  //be sent with a new access token, client will then understand this and redirect to /dashboard

  //If the user does not have a refresh token cookie that mean user has not signed in, ref:1 on /auth/auth.ts will fail
  //and status 403 will be sent (ref:2 on /auth/auth.ts). Client wil then understand this and redirect user to /login

  if (!res.headersSent) {
    res.send(200)
  }

})

app.listen(PORT, () => {

  console.log(`server running on ${PORT}`)

});


