import { list } from '@keystone-6/core'
import { allowAll } from '@keystone-6/core/access'
import { relationship, text, integer } from '@keystone-6/core/fields'

import { type Lists } from '.keystone/types'

export const lists = {
  Post: list({
    access: allowAll,
    fields: {
      title: text({ validation: { isRequired: true } }),
      tags: relationship({
        ref: 'PostTag.post',
        many: true,
        ui: {
          views: "./fields/explicit-relationship",
        },
      }),
    },
    hooks: {
      // delete all PostTag records related to the Post being deleted
      beforeOperation: async ({ item, operation, context }) => {
        if (operation === "delete") {
          await context.prisma.postTag.deleteMany({
            where: { postId: { equals: item.id } }
          })
        }
      },
    },
  }),
  Tag: list({
    access: allowAll,
    fields: {
      title: text(),
    },
    hooks: {
      beforeOperation: async ({ item, operation, context }) => {
        // delete all PostTag records related to the Tag being deleted
        if (operation === "delete") {
          await context.prisma.postTag.deleteMany({
            where: { tagId: { equals: item.id } }
          })
        }
      },
    },
  }),
  PostTag: list({
    access: allowAll,
    fields: {
      post: relationship({ ref: "Post.tags" }),
      tag: relationship({ ref: "Tag" }),
      order: integer({ defaultValue: 0 }),
    },
    ui: {
      isHidden: true
    },
    db: {
      // Ensure a post can't bre related to the same tag multiple times
      extendPrismaSchema(schema) {
        return schema.replace(/\}/g, `
          @@unique([postId, tagId])
        }`)
      },
    }
  })
} satisfies Lists