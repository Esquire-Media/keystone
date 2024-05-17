import { list, graphql } from '@keystone-6/core';
import { allowLoggedIn, getTenantUserIds, getUniqueObjectsByKey, getUserTenantIds, isGlobalAdmin } from '../../utils';
import { password, text, virtual } from '@keystone-6/core/fields';
import { BaseListTypeInfo, ListAccessControl } from '@keystone-6/core/types';
import merge from 'lodash.merge';

export const User = list({
  access: merge(allowLoggedIn(), {
    filter: {
      query: async ({ context }) => {
        if (!context.session) return false; // Deny unsessioned queries
        if (isGlobalAdmin(context)) return {}; // Allow access to global admins.
        // Get all of the current User's related Tenants
        const tenantIds = await getUserTenantIds(context.sudo())
        const descendantIds = (await Promise.all(
          tenantIds.map(t => getTenantUserIds(context.sudo(), t))
        ))
        const ids = Array.from(new Set(
          [
            ...tenantIds,
            ...descendantIds.flat()
          ],
        ));
        return { id: { in: ids } }
      }
    }
  } as Partial<ListAccessControl<BaseListTypeInfo>>),
  fields: {
    name: text({ validation: { isRequired: true } }),
    email: text({
      validation: { isRequired: true },
      isIndexed: 'unique', // Make the email field unique and indexed for faster queries.
      isFilterable: true, // Allow the email field to be filterable in queries.
      isOrderable: true, // Allow the email field to be sorted in list views.
      hooks: {
        validateInput: ({ resolvedData, addValidationError, item }) => {
          // If the resolved data does not contain a new email but the existing record does, skip validation.
          if (!resolvedData.email && item?.email) return;

          // Regular expression pattern to validate email format.
          const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
          if (!emailRegex.test(resolvedData.email)) {
            // Add a validation error if the email format is invalid.
            addValidationError('Invalid email format');
          }
        },
      },
    }),
    password: password(),

    // Virtual field to retrieve a list of tenants associated with the user.
    tenants: virtual({
      field: (lists) => {
        return graphql.field({
          // Use the same arguments as those defined in the Tenant list's findMany function.
          args: lists.Tenant.types.findManyArgs,
          // Set the return type to a list of non-null Tenant objects.
          type: graphql.list(graphql.nonNull(lists.Tenant.types.output)),
          // Resolve function to retrieve tenants and their descendants associated with the user.
          resolve: async (item, args, context) => {
            // Retrieve and return the tenants and their descendants, filtered by the combined tenant and descendant IDs.
            return context.db.Tenant.findMany({
              where: {
                AND: [
                  { id: { in: await getUserTenantIds(context, context.session.itemId) } }, // Include both tenants and descendants.
                  args.where, // Apply additional criteria from the query arguments.
                ],
              },
            });
          },
        });
      },
      ui: {
        query: `{ id title }`,
      },
    })
  },
});
