import { list } from '@keystone-6/core'
import { allowLoggedIn } from '../utils';
import { Operations } from '../types';
import { relationship, select } from '@keystone-6/core/fields';
import merge from 'lodash.merge'

export const Permission = list({
  access: merge(allowLoggedIn, {
    
  }),
  fields: {
    tenant: relationship({ ref: "Tenant", many: false }),
    delegates: relationship({ ref: "User", many: true }),
    operation: select({...Operations}),
  },
  ui: {
    listView: {
      initialColumns: ["tenant", "operation", "delegates"],
    },
  },
})