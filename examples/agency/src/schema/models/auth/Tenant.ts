import { list, graphql } from '@keystone-6/core';
import { allowLoggedIn, can, getTenantAncestorIds, getTenantDescendantIds, getTenantUserIds, getUserTenantIds, isGlobalAdmin } from '../../utils';
import { relationship, text, virtual } from '@keystone-6/core/fields';
import { Operations } from '../../types';
import { BaseListTypeInfo, ListAccessControl } from '@keystone-6/core/types';
import merge from 'lodash.merge';

export const Tenant = list({
  access: merge(allowLoggedIn(), {
    filter: {
      query: async ({ context }) => {
        if (!context.session) return false; // Deny unsessioned queries
        if (isGlobalAdmin(context)) return {}; // Allow access to global admins.
        const ids = await getUserTenantIds(context.sudo())
        return { id: { in: ids } }
      },
    },
    item: {
      create: ({ context, inputData }) => {
        if (!context.session) return false; // Deny unsessioned queries
        if (isGlobalAdmin(context)) return true; // Allow access to global admins.
        // Ensure the parent tenant has a valid connection.
        if (!inputData.parent?.connect) return false;
        // Check if the user has permission to create under the parent tenant.
        return can(context, inputData.parent.connect.id, "C")
      },
      update: async ({ context, item, inputData }) => {
        if (!context.session) return false; // Deny unsessioned queries
        if (isGlobalAdmin(context)) return true; // Allow access to global admins.
        // Ensure the existing tenant has a parent.
        if (!item.parentId) return false;
        // Check if request is authorized to make updates to the current parent.
        const hasUpdatePermissionOnParent = await can(context, item.parentId.toString(), "U");
        // Check if request is authorized to make updates to new current parent.
        const hasUpdatePermissionOnNewParent = !inputData.parent?.connect || await can(context, inputData.parent.connect.id, "U");
        // Allow updating only if the user has required permissions.
        return hasUpdatePermissionOnParent && hasUpdatePermissionOnNewParent;
      },
      delete: ({ context, item }) => {
        if (!context.session) return false; // Deny unsessioned queries
        if (isGlobalAdmin(context)) return true; // Allow access to global admins.
        // Ensure the tenant has a parent to authorize the delete operation.
        if (!item.parentId) return false;
        // Check if the user has delete permission on the parent tenant.
        return can(context, item.parentId.toString(), "D");
      },
    },
  } as Partial<ListAccessControl<BaseListTypeInfo>>),
  fields: {
    title: text({ validation: { isRequired: true }, isIndexed: 'unique' }),

    // Relationship to establish hierarchical structure.
    parent: relationship({
      ref: 'Tenant.children',
      many: false,
      ui: {
        hideCreate: true,
        itemView: { fieldMode: 'hidden' },
      },
    }),

    // Reverse relationship to represent child tenants.
    children: relationship({
      ref: 'Tenant.parent',
      many: true,
      ui: {
        hideCreate: true,
        createView: { fieldMode: 'hidden' },
      },
    }),

    // Virtual field to retrieve all ancestor tenants (parents, grandparents, etc.).
    ancestors: virtual({
      field: (lists) =>
        graphql.field({
          args: lists.Tenant.types.findManyArgs,
          type: graphql.list(graphql.nonNull(lists.Tenant.types.output)),
          resolve: async (item, args, context) => {
            // Start with the current tenant and collect all its ancestors.
            const ids = await getTenantAncestorIds(context, item.id.toString())
            if (!ids) return []
            return context.db.Tenant.findMany({
              where: {
                AND: [
                  { id: { in: ids } }, args.where
                ]
              }
            });
          },
        }),
      ui: {
        query: '{ id title }',
        createView: { fieldMode: "hidden" },
        // itemView: { fieldMode: "hidden" },
        listView: { fieldMode: "hidden" },
      },
    }),

    // Virtual field to retrieve all descendant tenants (children, grandchildren, etc.).
    descendants: virtual({
      field: (lists) =>
        graphql.field({
          args: lists.Tenant.types.findManyArgs,
          type: graphql.list(graphql.nonNull(lists.Tenant.types.output)),
          resolve: async (item, args, context) => {
            // Retrieve all descendant tenant IDs using the recursive function.
            const ids = await getTenantDescendantIds(context, item.id.toString());
            // Retrieve the tenant objects filtered by additional conditions.
            if (!ids) return []
            return context.db.Tenant.findMany({
              where: {
                AND: [{ id: { in: ids } }, args.where],
              },
            });
          },
        }),
      ui: {
        query: '{ id title }',
        createView: { fieldMode: "hidden" },
        itemView: { fieldMode: "hidden" },
        listView: { fieldMode: "hidden" },
      },
    }),

    // Virtual field to retrieve all users with permissions for the tenant or its ancestors.
    users: virtual({
      field: (lists) => {
        return graphql.field({
          args: lists.User.types.findManyArgs,
          type: graphql.list(graphql.nonNull(lists.User.types.output)),
          resolve: async (item, args, context) => {
            const ids = await getTenantUserIds(context, item.id.toString())
            return context.db.User.findMany({
              where: {
                AND: [{ id: { in: ids } }, args.where],
              },
            });
          },
        });
      },
      ui: {
        query: '{ id name email }',
        // createView: { fieldMode: "hidden" },
        // itemView: { fieldMode: "hidden" },
        // listView: { fieldMode: "hidden" },
      },
    }),
  },
  ui: {
    listView: {
      initialColumns: ['title', 'parent', 'children'],
    },
  },
  hooks: {
    // Automatically create permissions for each operation when a new tenant is created.
    afterOperation: async ({ context, item, operation }) => {
      if (operation === 'create') {
        await context.db.Permission.createMany({
          data: Operations.options.map((o) => ({
            tenant: { connect: { id: item.id } },
            operation: typeof o === 'string' ? o : o.value,
          })),
        });
      }
    },
  },
});
