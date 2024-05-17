import { allowAll } from '@keystone-6/core/access'
import { BaseListTypeInfo, ListAccessControl, KeystoneContext } from "@keystone-6/core/types";
import merge from 'lodash.merge'
import { Ops } from './types';

export const isLoggedIn = ({ session }: KeystoneContext) => {
  return !!session
}

export function allowLoggedIn() {
  return {
    operation: {
      query: ({ context }) => isLoggedIn(context),
      create: ({ context }) => isLoggedIn(context),
      update: ({ context }) => isLoggedIn(context),
      delete: ({ context }) => isLoggedIn(context),
    },
    filter: {
      query: ({ context }) => (isLoggedIn(context) ? {} : false),
      update: ({ context }) => (isLoggedIn(context) ? {} : false),
      delete: ({ context }) => (isLoggedIn(context) ? {} : false),
    },
    item: {
      create: ({ context }) => isLoggedIn(context),
      update: ({ context }) => isLoggedIn(context),
      delete: ({ context }) => isLoggedIn(context),
    },
  } as ListAccessControl<BaseListTypeInfo>
};

export const allowAllQuery: ListAccessControl<BaseListTypeInfo> = merge(allowLoggedIn(), {
  operation: {
    query: allowAll,
  },
  filter: {
    query: allowAll,
  } as Partial<ListAccessControl<BaseListTypeInfo>>,
});

export const allowAllCreate: ListAccessControl<BaseListTypeInfo> = merge(
  allowLoggedIn(),
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

export async function getTenantAncestorIds(context: KeystoneContext, tenant: string | { id: string }) {
  tenant = typeof tenant === "string" ? tenant : tenant.id
  let current = await context.db.Tenant.findOne({ where: { id: tenant } })
  const ancestors = [];
  while (current?.parentId) {
    current = await context.db.Tenant.findOne({
      where: { id: current.parentId.toString() },
    });
    ancestors.push(current);
  }
  // Reverse the ancestors' order to start from the root.
  return ancestors.map((a: any) => a.id).reverse();
}

// Recursive function to fetch all descendants of a tenant.
export async function getTenantDescendantIds(
  context: KeystoneContext,
  tenant: string | { id: string },
  visited = new Set<string>()
): Promise<string[]> {
  tenant = typeof tenant === "string" ? tenant : tenant.id
  // Prevent circular recursion by keeping track of visited nodes.
  if (visited.has(tenant)) return [];
  visited.add(tenant);

  // Retrieve children tenants directly associated with the current tenant.
  const children = await context.db.Tenant.findMany({
    where: { parent: { id: { equals: tenant } } },
  });

  // Recursively fetch the descendants of each child tenant.
  const descendantPromises: Promise<string[]>[] = children.map(async (child) => [
    child.id.toString(),
    ...(await getTenantDescendantIds(context, child.id.toString(), visited)),
  ]);

  // Resolve all promises, then flatten and return the results.
  const descendantsArray = await Promise.all(descendantPromises);
  return Array.from(new Set(descendantsArray.flat()));
}

export async function getTenantUserIds(context: KeystoneContext, tenant: string | { id: string }) {
  tenant = typeof tenant === "string" ? tenant : tenant.id
  const tenantIds = [
    tenant,
    ...(await getTenantAncestorIds(context, tenant))
  ]
  const permissions = await context.prisma.permission.findMany({
    include: {
      delegates: true,
    },
    where: {
      tenant: { id: { in: tenantIds } },
      operation: { equals: "R" }
    },
  })
  return getUniqueObjectsByKey(permissions.map(p => p.delegates).flat(), "id").map(d => d.id)
}

export async function getUserTenantIds(context: KeystoneContext, user?: string | { id: string }) {
  if (!user) {
    user = context.session.itemId
  } else {
    user = typeof user === "string" ? user : user.id
  }
  const permissions = await context.prisma.permission.findMany({
    where: {
      delegates: { some: { id: user } },
      operation: { equals: "R" }
    },
  })
  const ids: string[] = [
    ...permissions.map(p => p.tenantId),
    ...Array.from(
      new Set((
        await Promise.all(
          permissions.map(p => getTenantDescendantIds(context, p.tenantId))
        )
      ).flat())
    )
  ]
  return ids
}

export async function can(context: KeystoneContext, tenant: string | { id: string }, operation: Ops = "R", user?: string | { id: string }) {
  if (!user) {
    user = context.session.itemId
  } else {
    user = typeof user === "string" ? user : user.id
  }
  tenant = typeof tenant === "string" ? tenant : tenant.id
  const tenantIds = [
    tenant,
    ...(await getTenantAncestorIds(context, tenant))
  ]
  return Boolean(await context.prisma.permission.count({
    where: {
      delegates: { some: { id: user } },
      operation: { equals: operation },
      tenant: { id: { in: tenantIds } },
    },
  }))
}