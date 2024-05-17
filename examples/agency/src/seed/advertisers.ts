import { KeystoneContext } from "@keystone-6/core/types";

/**
 * Seeds advertiser data in the database.
 * - Identifies existing advertisers by their titles.
 * - Creates new advertisers with unique titles.
 * - Associates advertisers with tenants.
 * 
 * @param {Context} context - KeystoneJS context object, providing access to the database.
 */
export default async function seedAdvertisers(context: KeystoneContext) {
  try {
    console.log(`📢 Seeding advertisers...`);

    // Use the sudo context to bypass access control
    const { db } = context.sudo();

    // Find tenants already in the database by their title
    const tenantsInDatabase = await db.Tenant.findMany({
      where: { title: { in: advertisers.map((x) => x.tenant) } },
    });

    // Create a mapping from tenant title to tenant ID
    const tenantTitleToIdMap = tenantsInDatabase.reduce((map, tenant) => {
      map[tenant.title] = tenant.id;
      return map;
    }, {} as Record<string, string>);

    // Find advertisers already in the database by their title
    const alreadyInDatabase = await db.Advertiser.findMany({
      where: { title: { in: advertisers.map((x) => x.title) } },
    });

    // Determine which advertisers need to be created by filtering out already existing ones
    const toCreate = advertisers.filter(
      (seed) => !alreadyInDatabase.some((x) => x.title === seed.title)
    );

    // Create new advertisers
    await db.Advertiser.createMany({
      data: toCreate.map((advertiser) => ({
        title: advertiser.title,
        tenant: { connect: { id: tenantTitleToIdMap[advertiser.tenant] } },
      })),
    });

    console.log(`📢 Seeding advertisers completed.`);
  } catch (error) {
    // Log error if seeding advertisers fails
    console.error('🚨📢 Error seeding advertisers:', error);
  }
}

const advertisers = [
  { title: 'Alpha Advertising', tenant: 'Global Corp' },
  { title: 'Beta Branding', tenant: 'Global Corp' },
  { title: 'Gamma Marketing', tenant: 'Global Corp' },
  { title: 'Delta Promotions', tenant: 'Global Corp North America' },
  { title: 'Epsilon Media', tenant: 'Global Corp North America' },
  { title: 'Zeta Digital', tenant: 'Global Corp Europe' },
  { title: 'Eta Campaigns', tenant: 'Global Corp Europe' },
  { title: 'Theta Outreach', tenant: 'Global Corp Europe' },
  { title: 'Iota Networks', tenant: 'Global Corp Asia' },
  { title: 'Kappa Solutions', tenant: 'Global Corp Asia' },
  { title: 'Lambda Strategies', tenant: 'North America East' },
  { title: 'Mu Enterprises', tenant: 'North America East' },
  { title: 'Nu Innovations', tenant: 'North America West' },
  { title: 'Xi Advertising', tenant: 'North America West' },
  { title: 'Omicron Outreach', tenant: 'North America West' },
  { title: 'Pi Media', tenant: 'Europe West' },
  { title: 'Rho Branding', tenant: 'Europe West' },
  { title: 'Sigma Promotions', tenant: 'Europe East' },
  { title: 'Tau Marketing', tenant: 'Europe East' },
  { title: 'Upsilon Campaigns', tenant: 'Asia East' },
  { title: 'Phi Solutions', tenant: 'Asia East' },
  { title: 'Chi Digital', tenant: 'Asia West' },
  { title: 'Psi Networks', tenant: 'Asia West' },
  { title: 'Omega Enterprises', tenant: 'Asia West' },
  { title: 'NYC Advertising', tenant: 'NY Office' },
  { title: 'LA Branding', tenant: 'LA Office' },
  { title: 'Hollywood Promotions', tenant: 'LA Office' },
  { title: 'London Media', tenant: 'London Office' },
  { title: 'Big Ben Branding', tenant: 'London Office' },
  { title: 'Berlin Marketing', tenant: 'Berlin Office' },
  { title: 'Brandenburg Campaigns', tenant: 'Berlin Office' },
  { title: 'Beijing Networks', tenant: 'Beijing Office' },
  { title: 'Great Wall Solutions', tenant: 'Beijing Office' },
  { title: 'Tokyo Enterprises', tenant: 'Tokyo Office' },
  { title: 'Shibuya Digital', tenant: 'Tokyo Office' },
  { title: 'Dubai Media', tenant: 'Dubai Office' },
  { title: 'Burj Promotions', tenant: 'Dubai Office' },
  { title: 'Mumbai Branding', tenant: 'Mumbai Office' },
  { title: 'Gateway of India Marketing', tenant: 'Mumbai Office' },
  { title: 'Remote East Campaigns', tenant: 'Remote East' },
  { title: 'Remote West Solutions', tenant: 'Remote West' },
];
