import { list, graphql } from '@keystone-6/core';
import { allowLoggedIn, getUniqueObjectsByKey, isGlobalAdmin } from '../utils';
import { password, text, virtual } from '@keystone-6/core/fields';

export const User = list({
  access: allowLoggedIn,
  fields: {
    name: text({ validation: { isRequired: true } }),
    email: text({
      validation: { isRequired: true },
      isIndexed: "unique",
      isFilterable: true,
      isOrderable: true,
      hooks: {
        validateInput: ({ resolvedData, addValidationError, item }) => {
          // If there's no new email input but an existing email is present, skip validation.
          if (!resolvedData.email && item?.email) return;
          // Regular expression pattern to validate email format.
          const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
          if (!emailRegex.test(resolvedData.email)) {
            addValidationError('Invalid email format');
          }
        },
      },
    }),
    password: password(),

    // Virtual field representing a user's tenants.
    tenants: virtual({
      field: (lists) => {
        return graphql.field({
          // Use arguments based on the Tenant list's findMany arguments.
          args: lists.Tenant.types.findManyArgs,
          // Set the return type to a list of non-null Tenant objects.
          type: graphql.list(graphql.nonNull(lists.Tenant.types.output)),
          // Resolve function to find the relevant tenants and their descendants.
          resolve: async (item, args, context) => {
            const sudo = context.sudo()
            // Retrieve permissions where the user is a delegate and the tenant matches the filter criteria.
            const permissions = await sudo.query.Permission.findMany({
              where: {
                tenant: args.where,
                delegates: { some: { id: { equals: item.id } } },
              },
              query: `tenant { id }`,
            });

            // Extract unique tenant IDs.
            const tenantIds = getUniqueObjectsByKey(
              permissions.map((p) => p.tenant).flat(),
              "id"
            ).map((t) => t.id);

            // Return an empty list if no tenant IDs were found.
            if (!tenantIds.length) return [];

            // Find descendants of these tenants.
            const descendantIds = getUniqueObjectsByKey(
              (
                await sudo.query.Tenant.findMany({
                  where: {
                    AND: [{ id: { in: tenantIds } }, args.where],
                  },
                  query: "descendants { id }",
                })
              ).map((t) => t.descendants).flat(),
              "id"
            ).map((t) => t.id);

            // Retrieve tenants and their descendants filtered by additional criteria.
            return sudo.db.Tenant.findMany({
              where: {
                AND: [
                  { id: { in: [...tenantIds, ...descendantIds] } },
                  args.where,
                ],
              },
            });
          },
        });
      },
      ui: {
        query: `{ id title }`,
      },
    }),

    // Virtual field for checking if the user has a specific permission for a tenant.
    can: virtual({
      field: (lists) => {
        return graphql.field({
          // Accept tenant and operation as arguments.
          args: {
            tenant: graphql.arg({
              type: graphql.nonNull(lists.Tenant.types.uniqueWhere),
            }),
            operation: graphql.arg({
              type: graphql.nonNull(graphql.String),
            }),
          },
          // Return a non-null Boolean to indicate whether the user has the permission.
          type: graphql.nonNull(graphql.Boolean),
          // Resolve function to determine if the user can perform the operation.
          resolve: async (item, args, context) => {
            // Global admin always has access.
            if (isGlobalAdmin(context))
              return true;

            // Retrieve permissions where the user is a delegate and the operation matches.
            const permissions = await context
              .sudo()
              .query.Permission.findMany({
                where: {
                  delegates: { some: { id: { equals: item.id } } },
                  operation: { equals: args.operation },
                },
                query: "tenant { id descendants { id } }",
              });

            // Check if the tenant or any of its descendants is directly linked to the permission.
            if (
              permissions.find((p) => p.tenant.id === args.tenant.id) ||
              getUniqueObjectsByKey(
                permissions.map((p) => p.tenant.descendants).flat(),
                "id"
              ).find((d) => d.id === args.tenant.id)
            )
              return true;

            // Deny permission if no matching permission is found.
            return false;
          },
        });
      },
      ui: {
        createView: { fieldMode: "hidden" },
        itemView: { fieldMode: "hidden" },
        listView: { fieldMode: "hidden" },
      },
    }),
  },
});
