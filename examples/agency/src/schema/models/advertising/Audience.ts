import { list, group, graphql } from '@keystone-6/core';
import { allowLoggedIn, can, isGlobalAdmin } from '../../utils';
import { checkbox, integer, relationship, select, text, virtual } from '@keystone-6/core/fields';
import { queryBuilder } from '@keystone-6/fields-query-builder'
import { BaseListTypeInfo, ListAccessControl } from '@keystone-6/core/types';
import merge from 'lodash.merge';

export const Audience = list({
  access: merge(allowLoggedIn(), {
    filter: {
      query: async ({ context }) => {
        if (!context.session) return false; // Deny unsessioned queries
        if (isGlobalAdmin(context)) return {}; // Allow access to global admins.
        const ids = (await context.query.Advertiser.findMany({ query: "id" })).map(a => a.id)
        return { advertiser: { id: { in: ids } } }
      },
    },
    item: {
      create: async ({ context, inputData }) => {
        if (!context.session) return false; // Deny unsessioned queries
        if (isGlobalAdmin(context)) return true; // Allow access to global admins.
        // Ensure the owning advertiser has a valid connection.
        if (!inputData.advertiser?.connect) return false;
        const tenant = (await context.query.Advertiser.findOne({
          where: { id: inputData.advertiser.connect.id },
          query: "tenant { id }"
        })).tenant
        // Check if session is authorized to create things for the current tenant.
        return can(context, tenant.id, "C")
      },
      update: async ({ context, item, inputData }) => {
        if (!context.session) return false; // Deny unsessioned queries
        if (isGlobalAdmin(context)) return true; // Allow access to global admins.
        // Ensure the existing tenant has a tenant.
        if (!item.advertiserId) return false;
        const currentTenant = (await context.query.Advertiser.findOne({
          where: { id: item.advertiserId.toString() },
          query: "tenant { id }"
        })).tenant
        // Check if session is authorized to make updates to the current tenant.
        const hasUpdatePermissionOnTenant = await can(context, currentTenant.id, "U");
        // Check if session is authorized to make updates to new tenant.
        const hasUpdatePermissionOnNewTenant = (
          !inputData.advertiser?.connect ||
          await can(
            context,
            (
              await context.query.Advertiser.findOne({
                where: { id: inputData.advertiser.connect.id },
                query: "tenant { id }"
              })
            ).tenant.id,
            "U"));
        // Allow updating only if the user has required permissions.
        return hasUpdatePermissionOnTenant && hasUpdatePermissionOnNewTenant;
      },
      delete: async ({ context, item }) => {
        if (!context.session) return false; // Deny unsessioned queries
        if (isGlobalAdmin(context)) return true; // Allow access to global admins.
        if (!item.advertiserId) return false;
        const tenant = (await context.query.Advertiser.findOne({
          where: { id: item.advertiserId.toString() },
          query: "tenant { id }"
        })).tenant
        // Check if the user has delete permission on the tenant tenant.
        return can(context, tenant.id, "D");
      },
    },
  } as Partial<ListAccessControl<BaseListTypeInfo>>),
  fields: {
    advertiser: relationship({
      ref: 'Advertiser',
      many: false,
      ui: {
        itemView: { fieldMode: "read" },
      },
    }),
    status: checkbox({ defaultValue: true }),
    tags: virtual({
      field: (lists) => {
        return graphql.field({
          args: lists.Tag.types.findManyArgs,
          type: graphql.list(graphql.nonNull(lists.Tag.types.output)),
          async resolve(item, args, context) {
            return (
              await context.query.AudienceTag.findMany({
                where: { audience: { id: { equals: item.id } }, tag: args.where },
                orderBy: { order: 'asc' },
                query: `tag { ${Object.keys(context.__internal.lists.Tag.fields).join(' ')} }`,
              })
            ).map((x) => ({ ...x.tag }));
          },
        });
      },
      ui: {
        views: './src/fields/virtual/views/tags_color', // Path to views file for custom field UI
        query: '{ id title }',
      },
      hooks: {
        // Hook to handle the explicit relationship between Post and Tag via AudienceTag records
        afterOperation: async ({ context, inputData, item }) => {
          if (inputData?.tags && Array.isArray(inputData.tags)) {
            const tagTitles = inputData.tags.filter((t) => !t.id).map((t) => t.title);
            const foundTags = await context.query.Tag.findMany({
              where: { title: { in: tagTitles } },
              query: 'id title',
            });
            // Update tags with found IDs
            inputData.tags.filter((t) => !t.id).forEach((t) => {
              t.id = foundTags.find((c) => c.title === t.title)?.id;
            });
            // Create new Tag records if not found
            const createdTags = await context.query.Tag.createMany({
              data: inputData.tags.filter((t) => !t.id).map((t) => {
                delete t.id;
                return t;
              }),
              query: 'id title',
            });
            // Set the IDs for the newly created tags
            inputData.tags.filter((t) => !t.id).forEach((t) => {
              t.id = createdTags.find((c) => c.title === t.title)?.id;
            });
            // Clear all related AudienceTag records to prevent unique constraint collisions
            await context.prisma.audienceTag.deleteMany({
              where: { audienceId: { equals: item.id } },
            });
            // Create new AudienceTags records to handle the explicit relationship
            const audienceTags = inputData.tags.map((t, order) => ({
              audience: { connect: { id: item.id } },
              tag: { connect: { id: t.id.toString() } },
              order,
            }));
            await context.query.AudienceTag.createMany({ data: audienceTags });
          }
        },
      },
    }),
    ...group({
      label: "Rebuild",
      description: "How often should this audience be regenerated?",
      fields: {
        rebuild: integer({ defaultValue: 1 }),
        rebuildUnit: select({
          type: "enum",
          options: [
            { label: "Day(s)", value: "days" },
            { label: "Weeks(s)", value: "weeks" },
            { label: "Month(s)", value: "months" },
          ],
          defaultValue: "months",
        }),
      },
    }),
    ...group({
      label: "Time To Live",
      description:
        "How long should an individual target stay in this audience?",
      fields: {
        TTL_Length: integer({ defaultValue: 1 }),
        TTL_Unit: select({
          type: "enum",
          options: [
            { label: "Day(s)", value: "days" },
            { label: "Weeks(s)", value: "weeks" },
            { label: "Month(s)", value: "months" },
          ],
          defaultValue: "months",
        }),
      },
    }),
    ...group({
      label: "Targeting",
      fields: {
        dataSource: relationship({
          ref: "TargetingDataSource",
          ui: {
            description: "What data set should this audience be based on?",
            labelField: "title",
            hideCreate: true,
          },
        }),
        dataFilter: queryBuilder({
          dependency: {
            field: "dataSource.filtering",
          },
          ui: {
            description: "How should the primary data set be filtered?",
            style: "antd",
          },
        }),
        processes: virtual({
          field: (lists) => {
            return graphql.field({
              args: lists.TargetingProcessingStep.types.findManyArgs,
              type: graphql.list(graphql.nonNull(lists.TargetingProcessingStep.types.output)),
              async resolve(item, args, context) {
                return (
                  await context.query.AudienceProcess.findMany({
                    where: { audience: { id: { equals: item.id } }, process: args.where },
                    orderBy: { order: 'asc' },
                    query: `process { ${Object.keys(context.__internal.lists.TargetingProcessingStep.fields).join(' ')} }`,
                  })
                ).map((x) => ({ ...x.process }));
              },
            });
          },
          ui: {
            views: './src/fields/virtual/views/processing_steps', // Path to views file for custom field UI
            query: '{ id }',
          },
          hooks: {
            // Hook to handle the explicit relationship between Post and Tag via AudienceTag records
            afterOperation: async ({ context, inputData, item }) => {
              if (inputData?.processes && Array.isArray(inputData.processes)) {
                // Clear all related AudienceProcess records to prevent unique constraint collisions
                await context.prisma.audienceProcess.deleteMany({
                  where: { audienceId: { equals: item.id } },
                });
                // Create new AudienceTags records to handle the explicit relationship
                const audienceProcesses = inputData.processes.map((p, order) => ({
                  audience: { connect: { id: item.id } },
                  process: { connect: { id: p.id.toString() } },
                  order,
                }));
                await context.query.AudienceProcess.createMany({ data: audienceProcesses });
              }
            },
          },
        }),
      },
    }),
    ...group({
      label: "Publishing",
      description: "Specify the IDs for the targeting objects on the supported platforms.",
      fields: {
        meta: text({ db: { isNullable: true } }),
        oneView: text({ db: { isNullable: true } }),
        xandr: text({ db: { isNullable: true } }),
      }
    }),
  },
  ui: {
    listView: {
      initialColumns: [
        "advertiser",
        "dataSource",
        "rebuild",
        "rebuildUnit",
        "status"
      ],
    },
  },
});

// Intermediate explicit join model for the Audience and Tag models
export const AudienceTag = list({
  access: allowLoggedIn(),
  fields: {
    audience: relationship({ ref: 'Audience' }),
    tag: relationship({ ref: 'Tag' }),
    order: integer({ defaultValue: 0, validation: { isRequired: true } }),
  },
  ui: {
    isHidden: true
  },
  db: {
    extendPrismaSchema(schema) {
      // Add unique constraints to prevent duplicate tag relations
      return schema.replace(/(model [^}]+)}/g, '$1@@unique([audienceId, tagId])\n@@unique([audienceId, order])\n}')
    },
  },
})

// Intermediate explicit join model for the Audience and Tag models
export const AudienceProcess = list({
  access: allowLoggedIn(),
  fields: {
    audience: relationship({ ref: 'Audience' }),
    process: relationship({ ref: 'TargetingProcessingStep' }),
    order: integer({ defaultValue: 0, validation: { isRequired: true } }),
  },
  ui: {
    isHidden: true
  },
  db: {
    extendPrismaSchema(schema) {
      // Add unique constraints to prevent duplicate tag relations
      return schema.replace(/(model [^}]+)}/g, '$1@@unique([audienceId, processId])\n@@unique([audienceId, order])\n}')
    },
  },
})