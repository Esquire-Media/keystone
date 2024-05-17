import { KeystoneContext } from "@keystone-6/core/types";
import seedAdmin from './admin';
import seedUsers from './users';
import seedTenants from './tenants';
import seedPermissions from './permissions';
import seedAdvertisers from './advertisers';


/**
 * Main function to seed the database with initial data.
 * - Calls the individual seeding functions sequentially.
 * 
 * @param {Context} context - KeystoneJS context object, providing access to the database.
 */
export default async function seedDatabase(context: KeystoneContext) {
  console.log(`🌱 Starting database seeding process...`);

  // Sequentially seed each aspect of the database
  await seedAdmin(context);
  await seedUsers(context);
  await seedTenants(context);
  await seedPermissions(context);
  await seedAdvertisers(context);

  console.log(`🌱 Database seeding process completed.`);
}
