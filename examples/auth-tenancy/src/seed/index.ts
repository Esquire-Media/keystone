import { type Context } from '.keystone/types'
import { authors } from '../../../example-data'
import * as dotenv from "dotenv";
import { getUniqueObjectsByKey } from '../schema/utils';

dotenv.config()

async function seedAdmin(context: Context) {
  if (process.env.ADMIN_EMAIL) {
    const admin = await context.sudo().query.User.findOne({
      where: { email: process.env.ADMIN_EMAIL },
      query: "id, name"
    })
    if (!admin) {
      await context.sudo().query.User.createOne({
        data: {
          name: process.env.ADMIN_NAME ?? "Admin",
          email: process.env.ADMIN_EMAIL,
          password: process.env.ADMIN_PASSWORD ?? "password",
        }
      })
    } else {
      if (process.env.ADMIN_NAME && (process.env.ADMIN_NAME !== admin.name)) {
        await context.sudo().query.User.updateOne({
          where: { id: admin.id },
          data: { name: process.env.ADMIN_NAME }
        })
      }
      if (process.env.ADMIN_PASSWORD) {
        await context.sudo().query.User.updateOne({
          where: { id: admin.id },
          data: { password: process.env.ADMIN_PASSWORD }
        })
      }
    }
  }
}

async function seedUsers(context: Context) {
  const users = getUniqueObjectsByKey(authors, "email")
  const { db } = context.sudo()
  const alreadyInDatabase = await db.User.findMany({
    where: { email: { in: users.map(x => x.email) } },
  })
  const toCreate = users.filter(seed => !alreadyInDatabase.some(x => x.email === seed.email))
  await db.User.createMany({ data: toCreate })
}

export default async function seedDatabase(context: Context) {
  console.log(`🌱 Seeding database...`)
  await seedAdmin(context)
  await seedUsers(context)
  console.log(`🌱 Seeding database completed.`)
}