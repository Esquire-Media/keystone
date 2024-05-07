import { list, graphql } from '@keystone-6/core';
import { checkbox, integer, relationship, text, virtual } from '@keystone-6/core/fields';
import { allowAll } from '@keystone-6/core/access';
import type { Lists } from '.keystone/types';

export const lists = {
  Post: list({
    access: allowAll,
    fields: {
      title: text({ isIndexed: 'unique', validation: { isRequired: true } }),
      content: text({ validation: { isRequired: true } }),
      listed: checkbox({}),

      // Virtual field to determine if the post is active (based on title, content length, and listing status)
      isActive: virtual({
        field: graphql.field({
          type: graphql.Boolean,
          resolve(item) {
            return item.title.length > 3 && item.content.length > 10 && item.listed === true;
          },
        }),
      }),

      // Virtual field to count words, sentences, and paragraphs in the content
      counts: virtual({
        field: graphql.field({
          type: graphql.object<{ words: number; sentences: number; paragraphs: number }>()({
            name: 'PostCounts',
            fields: {
              words: graphql.field({ type: graphql.Int }),
              sentences: graphql.field({ type: graphql.Int }),
              paragraphs: graphql.field({ type: graphql.Int }),
            },
          }),
          resolve(item) {
            const content = item.content ?? '';
            return {
              words: content.split(' ').length,
              sentences: content.split('.').length,
              paragraphs: content.split('\n\n').length,
            };
          },
        }),
        // Hide this virtual field from the item and list views
        ui: {
          itemView: { fieldMode: 'hidden' },
          listView: { fieldMode: 'hidden' },
        },
      }),

      // Virtual field to generate an excerpt with a configurable length
      excerpt: virtual({
        field: graphql.field({
          type: graphql.String,
          args: {
            length: graphql.arg({ type: graphql.nonNull(graphql.Int), defaultValue: 50 }),
          },
          resolve(item, { length }) {
            const { content = '' } = item;
            if (content.length <= length) return content;
            return content.slice(0, length) + '...';
          },
        }),
        ui: { query: '(length: 10)' },
      }),

      // Virtual field to fetch related posts using Keystone's GraphQL context
      related: virtual({
        field: (lists) => {
          return graphql.field({
            args: lists.Tag.types.findManyArgs,
            type: graphql.list(graphql.nonNull(lists.Post.types.output)),
            async resolve(item, args, context) {
              // Fetch post with related tags using `PostTag` intermediate model
              const seenValues = new Set<string>();
              return (
                await context.query.PostTag.findMany({
                  where: {
                    AND: [
                      {
                        tag: { title: { in: (item as any).tags?.map((t: any) => t.id) } },
                        post: { id: { notIn: [item.id] } }
                      },
                      { post: args.where }
                    ]
                  },
                  query: `post { id title }`,
                })
              ).map((x) => ({ ...x.post })).filter(item => {
                if (seenValues.has(item.id)) {
                  return false;
                } else {
                  seenValues.add(item.id);
                  return true;
                }
              });;
            },
          });
        },
        ui: { query: '{ id title }' },
      }),

      // Virtual field to fetch Tags linked to the Post through the PostTag intermediate model, allowing arguments from the Tag list schema
      tags: virtual({
        field: (lists) => {
          return graphql.field({
            args: lists.Tag.types.findManyArgs,
            type: graphql.list(graphql.nonNull(lists.Tag.types.output)),
            async resolve(item, args, context) {
              // Fetch tags linked to the post using `PostTag` intermediate model
              return (
                await context.query.PostTag.findMany({
                  where: {
                    post: {
                      id: {
                        equals: item.id,
                      },
                    },
                    tag: args.where,
                  },
                  orderBy: { order: 'asc' },
                  query: `tag { ${Object.keys(context.__internal.lists.Tag.fields).join(' ')} }`,
                })
              ).map((x) => ({ ...x.tag }));
            },
          });
        },
        ui: {
          views: './fields/virtual/tags', // Path to views file for custom field UI
          query: '{ id title }',
        },
        hooks: {
          // Hook to handle the explicit relationship between Post and Tag via PostTag records
          afterOperation: async ({ context, inputData, item }) => {
            if (inputData && inputData.tags && Array.isArray(inputData.tags)) {
              // Check for Tag records based on the supplied title when no id is provided
              const found = await context.query.Tag.findMany({
                where: { title: { in: inputData.tags.filter(t => !t.id).map(t => t.title) } },
                query: "id title"
              })
              if (found) {
                // When Tag records are found set the id value to the ordered list
                inputData.tags.filter(t => !t.id).forEach(t => {
                  t.id = found.find(c => c.title === t.title)?.id
                })
              }
              // Create new Tag records when it doesn't already exist
              const created = await context.query.Tag.createMany({
                data: inputData.tags.filter(t => !t.id).map((t) => {
                  delete t.id
                  return t
                }),
                query: "id title"
              })
              if (created) {
                // When Tag records are created set the id value to the ordered list
                inputData.tags.filter(t => !t.id).forEach(t => {
                  t.id = created.find(c => c.title === t.title)?.id
                })
              }

              // Clear all related PostTag records to prevent unique constraint collisions
              await context.prisma.postTag.deleteMany({
                where: { postId: { equals: item.id } },
              });
              // Create new PostTags records to handle the explicit relationship
              const PostTags = inputData.tags.map((t, order) => ({
                post: { connect: { id: item.id } },
                tag: { connect: { id: t.id.toString() } },
                order,
              }));
              await context.query.PostTag.createMany({ data: PostTags });
            }
          },
        },
      }),
    },
    hooks: {
      // Hook to delete PostTag records related to a Post if it's being deleted
      beforeOperation: async ({ item, operation, context }) => {
        if (operation === 'delete') {
          await context.prisma.postTag.deleteMany({
            where: { postId: { equals: item.id } },
          });
        }
      },
    },
  }),

  Tag: list({
    access: allowAll,
    fields: {
      title: text({ isIndexed: "unique" }),
    },
    hooks: {
      // Hook to delete PostTag records related to a tag being deleted
      beforeOperation: async ({ item, operation, context }) => {
        if (operation === 'delete') {
          await context.prisma.postTag.deleteMany({
            where: { tagId: { equals: item.id } },
          });
        }
      },
    },
  }),

  // Intermediate explicit join model for the Post and Tag models
  PostTag: list({
    access: allowAll,
    fields: {
      post: relationship({ ref: 'Post' }), // Reference to a post
      tag: relationship({ ref: 'Tag' }), // Reference to a tag
      order: integer({ defaultValue: 0 }), // Order of tags in a post, with default value
    },
    ui: {
      // isHidden: true // Optionally hide this list from the UI
    },
    db: {
      extendPrismaSchema(schema) {
        // Add unique constraints to prevent duplicate tag relations
        return schema.replace(/(model [^}]+)}/g, '$1@@unique([postId, tagId])\n@@unique([postId, order])\n}')
      },
    },
  }),
} satisfies Lists;
