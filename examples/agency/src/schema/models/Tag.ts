import { list } from '@keystone-6/core';
import { allowLoggedIn } from '../utils';
import { text } from '@keystone-6/core/fields';

export const Tag = list({
  access: allowLoggedIn(),
  fields: {
    title: text({ isIndexed: 'unique' }),
  },
  hooks: {
    beforeOperation: async ({ item, operation, context }) => {
      if (operation === 'delete') {
        await context.prisma.audienceTag.deleteMany({
          where: { tagId: { equals: item.id } },
        });
      }
    },
  },
})