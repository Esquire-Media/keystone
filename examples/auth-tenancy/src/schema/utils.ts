import { allowAll } from '@keystone-6/core/access'
import { BaseListTypeInfo, ListAccessControl, KeystoneContext } from "@keystone-6/core/types";
import merge from 'lodash.merge'

export const isLoggedIn = ({ session }: KeystoneContext) => !!session;

export const allowLoggedIn: ListAccessControl<BaseListTypeInfo> = {
  operation: {
    query: ({context}) => isLoggedIn(context),
    create: ({context}) => isLoggedIn(context),
    update: ({context}) => isLoggedIn(context),
    delete: ({context}) => isLoggedIn(context),
  },
  filter: {
    query: ({context}) => (isLoggedIn(context) ? {} : false),
    update: ({context}) => (isLoggedIn(context) ? {} : false),
    delete: ({context}) => (isLoggedIn(context) ? {} : false),
  },
  item: {
    create: ({context}) => isLoggedIn(context),
    update: ({context}) => isLoggedIn(context),
    delete: ({context}) => isLoggedIn(context),
  },
};

export const allowAllQuery: ListAccessControl<BaseListTypeInfo> = merge(allowLoggedIn, {
  operation: {
    query: allowAll,
  },
  filter: {
    query: allowAll,
  } as Partial<ListAccessControl<BaseListTypeInfo>>,
});

export const allowAllCreate: ListAccessControl<BaseListTypeInfo> = merge(
  allowLoggedIn,
  {
    operation: {
      create: allowAll,
    },
    item: {
      create: allowAll,
    } as Partial<ListAccessControl<BaseListTypeInfo>>,
  }
) as ListAccessControl<BaseListTypeInfo>;

export const allowAllQueryOrCreate: ListAccessControl<BaseListTypeInfo> = merge(
  allowAllQuery,
  allowAllCreate
);

export function isGlobalAdmin({ session }: KeystoneContext) {
  if (!session) return false;
  return session.data.email === process.env.ADMIN_EMAIL;
}

/**
 * Returns only the unique objects from an array based on the value of a specific key.
 * 
 * @param arr - The array of objects to filter
 * @param key - The key used to determine uniqueness
 * @returns A new array containing unique objects
 */
export function getUniqueObjectsByKey(arr: readonly Record<string, any>[], key: string): readonly Record<string, any>[] {
  const seen = new Set();
  return arr.filter(obj => {
    const value = obj[key];
    if (seen.has(value)) return false;
    seen.add(value);
    return true;
  });
}