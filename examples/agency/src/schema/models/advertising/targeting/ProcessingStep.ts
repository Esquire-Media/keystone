import { list } from '@keystone-6/core';
import { allowLoggedIn, can, isGlobalAdmin } from '../../../utils';
import { integer, relationship, select, text } from '@keystone-6/core/fields';
import { BaseListTypeInfo, ListAccessControl } from '@keystone-6/core/types';
import merge from 'lodash.merge';
import { DataType } from '../../../types';

export const TargetingProcessingStep = list({
  access: merge(allowLoggedIn(), {
    filter: {
      query: async ({ context }) => {
        if (!context.session) return false; // Deny unsessioned queries
        if (isGlobalAdmin(context)) return {}; // Allow access to global admins.
        const ids = (await context.query.Audience.findMany({ query: "id" })).map(a => a.id)
        return { audience: { id: { in: ids } } }
      },
    },
    item: {
      create: async ({ context, inputData }) => {
        if (!context.session) return false; // Deny unsessioned queries
        if (isGlobalAdmin(context)) return {}; // Allow access to global admins.
        // Ensure the owning advertiser has a valid connection.
        if (!inputData.audience?.connect) return false;
        const tenant = (await context.query.Audience.findOne({
          where: { id: inputData.audience.connect.id },
          query: "advertiser { tenant { id } }"
        })).advertiser.tenant
        // Check if session is authorized to create things for the current tenant.
        return can(context, tenant.id, "C")
      },
      update: async ({ context, item, inputData }) => {
        if (!context.session) return false; // Deny unsessioned queries
        if (isGlobalAdmin(context)) return true; // Allow access to global admins.
        if (!item.audienceId) return false;
        const tenant = (await context.query.Audience.findOne({
          where: { id: item.audienceId.toString() },
          query: "advertiser { tenant { id } }"
        })).advertiser.tenant
        // Check if session is authorized to make updates to the current tenant.
        return can(context, tenant.id, "U");
      },
      delete: async ({ context, item }) => {
        if (!context.session) return false; // Deny unsessioned queries
        if (isGlobalAdmin(context)) return {}; // Allow access to global admins.
        if (!item.audienceId) return false;
        const tenant = (await context.query.Audience.findOne({
          where: { id: item.audienceId.toString() },
          query: "advertiser { tenant { id } }"
        })).advertiser.tenant
        // Check if the user has delete permission on the tenant tenant.
        return can(context, tenant.id, "D");
      },
    },
  } as Partial<ListAccessControl<BaseListTypeInfo>>),
  fields: {
    outputType: select(DataType),
    customCoding: text({
      ui: {
        views: "./src/fields/text/views/codeblock/json"
      },
    }),
  },
  ui: {
    label: "Processing Steps",
    isHidden: ({context}) => !(isGlobalAdmin(context)),
    hideCreate: ({context}) => !(isGlobalAdmin(context)),
    hideDelete: ({context}) => !(isGlobalAdmin(context)),
    listView: {
      initialColumns: ["audience", "outputType", "sort"],
    },
  },
});


