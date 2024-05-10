import { KeystoneContext } from "@keystone-6/core/types";
import * as dotenv from 'dotenv';

dotenv.config(); // Initialize environment variables

/**
 * Seeds the admin user in the database.
 * - If an admin email is provided in the environment variables:
 *   - Checks if the admin user already exists.
 *   - If not, creates a new admin user with the details from environment variables.
 *   - If an admin user exists, updates their name and password if needed.
 * 
 * @param {Context} context - KeystoneJS context object, providing access to the database.
 */
export default async function seedAdmin(context: KeystoneContext) {
  try {
    console.log(`👩‍💼 Seeding admin user...`);

    // Check if the admin email is set in environment variables
    if (process.env.ADMIN_EMAIL) {
      // Use sudo context to bypass access control and modify admin data
      const sudo = context.sudo();

      // Query for an existing admin user by the admin email
      const admin = await sudo.query.User.findOne({
        where: { email: process.env.ADMIN_EMAIL },
        query: 'id name',
      });

      // If the admin user doesn't exist, create a new one
      if (!admin) {
        await sudo.query.User.createOne({
          data: {
            name: process.env.ADMIN_NAME ?? 'Admin', // Use fallback name if ADMIN_NAME is not set
            email: process.env.ADMIN_EMAIL,
            password: process.env.ADMIN_PASSWORD ?? 'password', // Use fallback password if ADMIN_PASSWORD is not set
          },
        });
      } else {
        // Prepare update fields if there are changes in environment variables
        const updates: Record<string, any> = {};

        if (process.env.ADMIN_NAME && process.env.ADMIN_NAME !== admin.name) {
          updates.name = process.env.ADMIN_NAME;
        }
        if (process.env.ADMIN_PASSWORD) {
          updates.password = process.env.ADMIN_PASSWORD;
        }

        // Update admin user if there are changes to apply
        if (Object.keys(updates).length > 0) {
          await sudo.query.User.updateOne({
            where: { id: admin.id },
            data: updates,
          });
        }
      }
    }

    console.log(`👩‍💼 Seeding admin user completed.`);
  } catch (error) {
    // Log error if seeding admin user fails
    console.error('🚨👩‍💼 Error seeding admin user:', error);
  }
}