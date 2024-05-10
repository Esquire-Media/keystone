import { KeystoneContext } from "@keystone-6/core/types";
import { can } from '../schema/utils';

// Define the possible roles a user can have.
type Role = 'view_only' | 'editor' | 'creator' | 'admin';

// Structure representing a tenant node in the hierarchical tenant tree.
interface TenantNode {
  id: string; // Unique identifier of the tenant
  title: string; // Name or title of the tenant
  parent?: { id: string }; // Reference to the parent tenant, if any
  children?: TenantNode[]; // Array of children tenant nodes
}

// Mapping of roles to their respective allowed operations.
const roles: Record<Role, string[]> = {
  view_only: ['R'], // View only role (Read)
  editor: ['R', 'U'], // Editor role (Read, Update)
  creator: ['C', 'R', 'U'], // Creator role (Create, Read, Update)
  admin: ['C', 'R', 'U', 'D'], // Admin role (Create, Read, Update, Delete)
};

/**
 * Seeds user permissions for all tenants based on hierarchical relationships.
 * 
 * @param context - The KeystoneJS execution context providing database and query access.
 */
export default async function seedPermissions(context: KeystoneContext) {
  console.log(`🛡️ Seeding user permissions...`);

  // Get elevated privileges to modify data directly.
  const { db, query } = context.sudo();

  // Retrieve all users except the designated admin user.
  const users = await query.User.findMany({
    where: { email: { not: { equals: process.env.ADMIN_EMAIL } } },
    query: 'id'
  });

  // Retrieve all tenants including their hierarchical relationships.
  const tenants = await query.Tenant.findMany({
    query: 'id title parent { id }'
  });

  // Build a hierarchical representation of tenants.
  const tenantTree = buildHierarchy(tenants);

  // Index used to assign users to different tenant roles in a round-robin manner.
  let userIndex = 0;

  /**
   * Assigns the specified roles to a tenant node and recursively assigns them to its children.
   * 
   * @param node - The current tenant node.
   * @param rolesToAssign - Array of roles to be assigned to this tenant node.
   */
  async function assignPermissions(node: TenantNode, rolesToAssign: Role[]) {
    for (const role of rolesToAssign) {
      // Assign the current user to the role in a round-robin fashion.
      const user = users[userIndex % users.length];
      userIndex++;

      // Assign all operations associated with the given role to the user for this tenant.
      for (const operation of roles[role]) {
        // Check if the user already has the permission; if not, add it.
        if (!(await can(context.sudo(), node.id, operation, user.id))) {
          // Check if a permission entry already exists for this tenant and operation.
          const existingPermissions = await db.Permission.findMany({
            where: {
              tenant: { id: { equals: node.id } },
              operation: { equals: operation }
            },
            take: 1
          });

          // If a permission entry exists, update it to include the new delegate user.
          if (existingPermissions.length > 0) {
            await db.Permission.updateOne({
              where: { id: existingPermissions[0].id.toString() },
              data: {
                delegates: {
                  connect: { id: user.id }
                }
              }
            });
          }
        }
      }
    }

    // Recursively assign permissions to all children of this tenant node.
    if (node.children) {
      for (const child of node.children) {
        await assignPermissions(child, rolesToAssign);
      }
    }
  }

  // Assign roles to all root tenants, applying a specific role pattern.
  for (const root of tenantTree) {
    await assignPermissions(root, ['admin', 'creator', 'editor', 'view_only']);
  }

  console.log(`🛡️ Seeding user permissions completed.`);
}

/**
 * Builds a hierarchical structure of tenants based on their parent-child relationships.
 * 
 * @param nodes - Flat array of tenant nodes retrieved from the database.
 * @returns - Array representing the root nodes of the hierarchical tree.
 */
function buildHierarchy(nodes: TenantNode[]): TenantNode[] {
  // Create a map to keep track of each node and its children.
  const nodeMap: Record<string, TenantNode> = {};
  const hierarchy: TenantNode[] = [];

  // Initialize a map of tenant nodes with empty children arrays.
  nodes.forEach(node => {
    nodeMap[node.id] = { ...node, children: [] };
  });

  // Link each node to its parent based on the parent relationship.
  nodes.forEach(node => {
    const currentNode = nodeMap[node.id];
    if (node.parent && node.parent.id) {
      const parentNode = nodeMap[node.parent.id];
      if (parentNode) {
        parentNode.children?.push(currentNode);
      }
    } else {
      // Nodes without a parent are root nodes and are added to the hierarchy.
      hierarchy.push(currentNode);
    }
  });

  return hierarchy;
}
