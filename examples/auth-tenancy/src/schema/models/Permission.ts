import { list } from '@keystone-6/core'
import { allowLoggedIn, isGlobalAdmin } from '../utils';
import { Operations } from '../types';
import { relationship, select } from '@keystone-6/core/fields';
import merge from 'lodash.merge'
import { BaseListTypeInfo, ListAccessControl } from '@keystone-6/core/types';

export const Permission = list({
  access: merge(allowLoggedIn(), {
    filter: {
      query: ({ context }) => {
        if (!context.session) return false; // Deny unsessioned queries
        if (isGlobalAdmin(context)) return {}; // Allow access to global admins.
        return { delegates: { some: { id: { equals: context.session.itemId } } } }
      }
    },
  } as Partial<ListAccessControl<BaseListTypeInfo>>
  ),
  fields: {
    tenant: relationship({ ref: "Tenant", many: false }),
    delegates: relationship({ ref: "User", many: true }),
    operation: select({ ...Operations }),
  },
  ui: {
    isHidden: ({ context }) => !isGlobalAdmin(context),
    listView: {
      initialColumns: ["tenant", "operation", "delegates"],
    },
  },
})