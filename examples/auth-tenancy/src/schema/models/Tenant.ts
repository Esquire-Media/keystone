// Import necessary modules and utilities from Keystone and lodash.
import { list, graphql } from '@keystone-6/core';
import { allowLoggedIn, getUniqueObjectsByKey, isGlobalAdmin } from '../utils';
import { relationship, text, virtual } from '@keystone-6/core/fields';
import { Operations } from '../types';
import { BaseListTypeInfo, ListAccessControl, KeystoneContext } from '@keystone-6/core/types';
import merge from 'lodash.merge';

// Recursive function to fetch all descendants of a tenant.
async function fetchDescendants(
  tenantId: string,
  context: KeystoneContext,
  visited = new Set<string>()
): Promise<string[]> {
  // Prevent circular recursion by keeping track of visited nodes.
  if (visited.has(tenantId)) return [];
  visited.add(tenantId);

  // Retrieve children tenants directly associated with the current tenant.
  const children = await context.db.Tenant.findMany({
    where: { parent: { id: { equals: tenantId } } },
  });

  // Recursively fetch the descendants of each child tenant.
  const descendantPromises: Promise<string[]>[] = children.map(async (child) => [
    child.id.toString(),
    ...(await fetchDescendants(child.id.toString(), context, visited)),
  ]);

  // Resolve all promises, then flatten and return the results.
  const descendantsArray = await Promise.all(descendantPromises);
  return descendantsArray.flat();
}

// Keystone list configuration for the `Tenant` schema.
export const Tenant = list({
  // Merge global access control with specific rules for this list.
  access: merge(allowLoggedIn, {
    // Custom query filtering logic for tenant visibility.
    filter: {
      query: async ({ context }) => {
        if (!context.session) return false;

        // Allow access to global admins.
        if (isGlobalAdmin(context)) return true;

        // Retrieve permissions where the user is a delegate and can read the tenant.
        const permissions = await context
          .sudo()
          .query.Permission.findMany({
            where: {
              delegates: { some: { id: { equals: context.session.itemId } } },
              operation: { equals: 'R' },
            },
            query: 'tenant { id descendants { id } }',
          });

        // Combine the current tenant and descendant IDs for querying.
        return {
          id: {
            in: [
              ...permissions.map((p) => p.tenant.id),
              ...getUniqueObjectsByKey(
                permissions.map((p) => p.tenant.descendants).flat(),
                'id'
              ).map((d) => d.id),
            ],
          },
        };
      },
    },
    // Item-level access control for creating, updating, and deleting tenants.
    item: {
      // Control who can create a new tenant.
      create: async ({ context, inputData }) => {
        if (!context.session) return false;

        // Global admins can create any tenant.
        if (isGlobalAdmin(context)) return true;

        // Ensure the parent tenant has a valid connection.
        if (!inputData.parent?.connect) return false;

        // Check if the user has permission to create under the parent tenant.
        return !!(
          await context.sudo().query.User.findOne({
            where: { id: context.session.itemId },
            query: `can(tenant: { id: "${inputData.parent.connect.id}" }, operation: "C")`,
          })
        )?.can;
      },

      // Control who can update an existing tenant.
      update: async ({ context, item, inputData }) => {
        if (!context.session) return false;

        // Global admins can update any tenant.
        if (isGlobalAdmin(context)) return true;

        // Ensure the existing tenant has a parent.
        if (!item.parentId) return false;

        // Use sudo context to validate update permission.
        const sudo = context.sudo();
        const hasUpdatePermissionOnParent = !!(
          await sudo.query.User.findOne({
            where: { id: context.session.itemId },
            query: `can(tenant: { id: "${item.parentId}" }, operation: "U")`,
          })
        )?.can;

        // If updating the parent, ensure the user has update permission on the new parent.
        const hasUpdatePermissionOnNewParent =
          !inputData.parent?.connect ||
          !!(
            await sudo.query.User.findOne({
              where: { id: context.session.itemId },
              query: `can(tenant: { id: "${inputData.parent.connect.id}" }, operation: "U")`,
            })
          )?.can;

        // Allow updating only if the user has required permissions.
        return hasUpdatePermissionOnParent && hasUpdatePermissionOnNewParent;
      },

      // Control who can delete a tenant.
      delete: async ({ context, item }) => {
        if (!context.session) return false;

        // Ensure the tenant has a parent to authorize the delete operation.
        if (!item.parentId) return false;

        // Check if the user has delete permission on the parent tenant.
        return !!(
          await context.sudo().query.User.findOne({
            where: { id: context.session.itemId },
            query: `can(tenant: { id: "${item.parentId}" }, operation: "D")`,
          })
        )?.can;
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
            let current: any = item;
            const ancestors = [];
            while (current?.parentId) {
              current = await context.db.Tenant.findOne({
                where: { id: current.parentId as string },
              });
              ancestors.push(current);
            }

            // Reverse the ancestors' order to start from the root.
            return ancestors.reverse();
          },
        }),
      ui: {
        query: '{ id title }',
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
            const ids = await fetchDescendants(item.id.toString(), context);
            if (!ids.length) return [];

            // Retrieve the tenant objects filtered by additional conditions.
            return context.db.Tenant.findMany({
              where: {
                AND: [{ id: { in: Array.from(new Set(ids)) } }, args.where],
              },
            });
          },
        }),
      ui: {
        query: '{ id title }',
      },
    }),

    // Virtual field to retrieve all users with permissions for the tenant or its ancestors.
    users: virtual({
      field: (lists) => {
        return graphql.field({
          args: lists.User.types.findManyArgs,
          type: graphql.list(graphql.nonNull(lists.User.types.output)),
          resolve: async (item, args, context) => {
            // Retrieve the tenant with all its ancestors.
            const tenant = await context.query.Tenant.findOne({
              where: { id: item.id.toString() },
              query: 'ancestors { id }',
            });
            if (!tenant || !tenant.ancestors) return [];

            // Extract all ancestor IDs.
            const ancestorIds = tenant.ancestors.map((a: any) => a.id);

            // Find permissions for both the tenant and its ancestors.
            const permissions = await context.query.Permission.findMany({
              where: { tenant: { id: { in: [...ancestorIds, item.id] } } },
              query: 'delegates { id }',
            });

            // Extract unique user IDs who have permissions.
            const ids = getUniqueObjectsByKey(
              permissions.map((p) => p.delegates).flat(),
              'id'
            ).map((u) => u.id);

            // Retrieve the user objects filtered by additional criteria.
            if (!ids.length) return [];
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
