import { KeystoneContext } from "@keystone-6/core/types";

/**
 * Seeds tenant data in the database.
 * - Identifies existing tenants by their titles.
 * - Creates new tenants with unique titles.
 * - Establishes parent-child relationships between tenants if specified.
 * 
 * @param {Context} context - KeystoneJS context object, providing access to the database.
 */
export default async function seedTenants(context: KeystoneContext) {
  try {
    console.log(`🏢 Seeding tenants...`);

    // Use the sudo context to bypass access control
    const { db } = context.sudo();

    // Find tenants already in the database by their title
    const alreadyInDatabase = await db.Tenant.findMany({
      where: { title: { in: tenants.map((x) => x.title) } },
    });

    // Determine which tenants need to be created by filtering out already existing ones
    const toCreate = tenants.filter(
      (seed) => !alreadyInDatabase.some((x) => x.title === seed.title)
    );

    // Create new tenants
    await db.Tenant.createMany({
      data: toCreate.map((tenant) => ({ title: tenant.title })),
    });

    // Retrieve all tenants now in the database to map titles to IDs
    const nowInDatabase = await db.Tenant.findMany({
      where: { title: { in: tenants.map((x) => x.title) } },
    });

    // Create a mapping from tenant title to tenant ID
    const titleToIdMap = nowInDatabase.reduce((map, tenant) => {
      map[tenant.title] = tenant.id;
      return map;
    }, {} as Record<string, string>);

    // Set parent-child relationships between tenants as specified in the seed data
    await Promise.all(
      toCreate
        .filter((tenant) => tenant.parent)
        .map((tenant) =>
          db.Tenant.updateOne({
            where: { id: titleToIdMap[tenant.title] },
            data: { parent: { connect: { id: titleToIdMap[tenant.parent!] } } },
          })
        )
    );

    console.log(`🏢 Seeding tenants completed.`);
  } catch (error) {
    // Log error if seeding tenants fails
    console.error('🚨🏢 Error seeding tenants:', error);
  }
}

const tenants = [
  { title: 'Global Corp', parent: null },
  { title: 'Global Corp North America', parent: 'Global Corp' },
  { title: 'Global Corp Europe', parent: 'Global Corp' },
  { title: 'Global Corp Asia', parent: 'Global Corp' },
  { title: 'North America East', parent: 'Global Corp North America' },
  { title: 'North America West', parent: 'Global Corp North America' },
  { title: 'Europe West', parent: 'Global Corp Europe' },
  { title: 'Europe East', parent: 'Global Corp Europe' },
  { title: 'Asia East', parent: 'Global Corp Asia' },
  { title: 'Asia West', parent: 'Global Corp Asia' },
  { title: 'NY Office', parent: 'North America East' },
  { title: 'LA Office', parent: 'North America West' },
  { title: 'London Office', parent: 'Europe West' },
  { title: 'Berlin Office', parent: 'Europe East' },
  { title: 'Beijing Office', parent: 'Asia East' },
  { title: 'Tokyo Office', parent: 'Asia East' },
  { title: 'Dubai Office', parent: 'Asia West' },
  { title: 'Mumbai Office', parent: 'Asia West' },
  { title: 'Remote East', parent: 'Asia East' },
  { title: 'Remote West', parent: 'Asia West' },
]