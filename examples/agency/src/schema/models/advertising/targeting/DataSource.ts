import { list } from '@keystone-6/core';
import { allowLoggedIn, isGlobalAdmin } from '../../../utils';
import { select, text } from '@keystone-6/core/fields';
import { BaseListTypeInfo, ListAccessControl } from '@keystone-6/core/types';
import merge from 'lodash.merge';
import { DataType } from '../../../types';

export const TargetingDataSource = list({
  access: merge(allowLoggedIn(), {
    operation: {
      create: ({ context }) => {
        return isGlobalAdmin(context); // Allow access to global admins.
      },
      update: ({ context }) => {
        return isGlobalAdmin(context); // Allow access to global admins.
      },
      delete: ({ context }) => {
        return isGlobalAdmin(context); // Allow access to global admins.
      },
    },
    filter: {
      query: ({ context }) => {
        if (isGlobalAdmin(context)) return {}; // Allow access to global admins.
        return { where: { title: { in: ["Custom GeoFrames"] } } }
      },
    }
  } as Partial<ListAccessControl<BaseListTypeInfo>>),
  fields: {
    dataType: select(DataType),
    title: text({
      validation: { isRequired: true },
      isIndexed: "unique",
    }),
    filtering: text({
      ui: {
        views: "./src/fields/text/views/codeblock/json"
      },
    }),
  },
  ui: {
    label: "Data Sources",
    isHidden: ({ context }) => !isGlobalAdmin(context),
    hideCreate: ({ context }) => !isGlobalAdmin(context),
    hideDelete: ({ context }) => !isGlobalAdmin(context),
    listView: {
      initialColumns: ["title", "dataType"],
    },
  },
});
