// import { User } from "@prisma/client";
// import { prisma } from "./prisma";

// export async function findUser(username:string):User{

//     const user = await prisma.user.findUnique({
//         where: { email: username }
//       })

//     return user || null
    

// }

// export function createUser(email: string,fname:string,lname:string,password:string,privilegeLevel:number){
//     prisma.user.create({
//         data: {
//           email: email,
//           fname: fname,
//           lname: lname,
//           password: password,
//           privilegeLevel: privilegeLevel
//         }
//       })
// }

