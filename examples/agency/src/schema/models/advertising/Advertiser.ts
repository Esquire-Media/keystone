import { list, group } from '@keystone-6/core';
import { allowLoggedIn, can, getUserTenantIds, isGlobalAdmin } from '../../utils';
import { relationship, text } from '@keystone-6/core/fields';
import { BaseListTypeInfo, ListAccessControl } from '@keystone-6/core/types';
import merge from 'lodash.merge';

export const Advertiser = list({
  access: merge(allowLoggedIn(), {
    filter: {
      query: async ({ context }) => {
        if (!context.session) return false; // Deny unsessioned queries
        if (isGlobalAdmin(context)) return {}; // Allow access to global admins.
        const ids = await getUserTenantIds(context.sudo())
        return { tenant: { id: { in: ids } } }
      },
    },
    item: {
      create: ({ context, inputData }) => {
        if (!context.session) return false; // Deny unsessioned queries
        if (isGlobalAdmin(context)) return {}; // Allow access to global admins.
        // Ensure the owning tenant has a valid connection.
        if (!inputData.tenant?.connect) return false;
        // Check if session is authorized to create things for the current tenant.
        return can(context, inputData.tenant.connect.id, "C")
      },
      update: async ({ context, item, inputData }) => {
        if (!context.session) return false; // Deny unsessioned queries
        if (isGlobalAdmin(context)) return true; // Allow access to global admins.
        // Ensure the existing tenant has a tenant.
        if (!item.tenantId) return false;
        // Check if session is authorized to make updates to the current tenant.
        const hasUpdatePermissionOnTenant = await can(context, item.tenantId.toString(), "U");
        // Check if session is authorized to make updates to new tenant.
        const hasUpdatePermissionOnNewTenant = !inputData.tenant?.connect || await can(context, inputData.tenant.connect.id, "U");
        // Allow updating only if the user has required permissions.
        return hasUpdatePermissionOnTenant && hasUpdatePermissionOnNewTenant;
      },
      delete: ({ context, item }) => {
        if (!context.session) return false; // Deny unsessioned queries
        if (isGlobalAdmin(context)) return {}; // Allow access to global admins.
        // Ensure the tenant has a tenant to authorize the delete operation.
        if (!item.tenantId) return false;
        // Check if the user has delete permission on the tenant tenant.
        return can(context, item.tenantId.toString(), "D");
      },
    },
  } as Partial<ListAccessControl<BaseListTypeInfo>>),
  fields: {
    title: text({ validation: { isRequired: true }, isIndexed: 'unique' }),
    tenant: relationship({
      ref: 'Tenant',
      many: false,
      ui: {
        itemView: { fieldMode: "read" },
      },
    }),
    ...group({
      label: "Publishing",
      description: "Specify the account IDs for the advertising accounts on the supported platforms.",
      fields: {
        meta: text({ db: { isNullable: true } }),
        oneView: text({ db: { isNullable: true } }),
        xandr: text({ db: { isNullable: true } }),
      }
    }),
  },
});
