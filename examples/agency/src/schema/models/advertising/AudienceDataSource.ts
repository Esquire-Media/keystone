import { list, group } from '@keystone-6/core';
import { allowLoggedIn, isGlobalAdmin } from '../../utils';
import { relationship, select, text } from '@keystone-6/core/fields';
import { BaseListTypeInfo, ListAccessControl } from '@keystone-6/core/types';
import merge from 'lodash.merge';
import { DataType } from '../../types';

export const AudienceDataSource = list({
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
  } as Partial<ListAccessControl<BaseListTypeInfo>>),
  fields: {
    dataType: select(DataType),
    title: text({
      validation: { isRequired: true },
      isIndexed: "unique",
    }),
    filtering: text({
      ui: {
        displayMode: "codeblock",
        props: {
          language: "json",
          options: {
            autoClosingBrackets: "always",
            autoClosingQuotes: "always",
            formatOnPaste: true,
            formatOnType: true,
            scrollBeyondLastLine: false,
          },
        },
      },
    }),
  },
  ui: {
    isHidden: ({context}) => !isGlobalAdmin(context),
    hideCreate: true,
    hideDelete: true,
    listView: {
      initialColumns: ["title", "dataType"],
    },
  },
});
