import { list, group } from '@keystone-6/core';
import { allowLoggedIn, isGlobalAdmin } from '../../../utils';
import { json, text } from '@keystone-6/core/fields';
import { BaseListTypeInfo, ListAccessControl } from '@keystone-6/core/types';
import merge from 'lodash.merge';

export const TargetingGeoFrame = list({
  access: merge(allowLoggedIn(), {
    operation: {
      query: ({ context }) => {
        return Boolean(context.session)
      },
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
    ESQID: text(),
    title: text(),
    polygon: json({
      ui: {
        views: "./src/fields/json/views/mapbox/default"
      },
    }),
    ...group({
      label: "Address",
      fields: {
        street: text(),
        city: text(),
        state: text(),
        zipCode: text(),
      }
    }),
  },
  ui: {
    label: "GeoFrames"
  }
});
