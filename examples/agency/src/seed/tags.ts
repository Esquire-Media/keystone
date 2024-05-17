import { KeystoneContext } from "@keystone-6/core/types";

/**
 * Seeds tag data in the database.
 * - Identifies existing tags by their titles.
 * - Creates new tags with unique titles.
 * 
 * @param {KeystoneContext} context - KeystoneJS context object, providing access to the database.
 */
export default async function seedTags(context: KeystoneContext) {
  try {
    console.log(`🏷️ Seeding tags...`);

    // Use the sudo context to bypass access control
    const { db } = context.sudo();

    // Find tags already in the database by their title
    const alreadyInDatabase = await db.Tag.findMany({
      where: { title: { in: Tags.map((x) => x.title) } },
    });

    // Determine which tags need to be created by filtering out already existing ones
    const toCreate = Tags.filter(
      (seed) => !alreadyInDatabase.some((x) => x.title === seed.title)
    );

    // Create new tags
    await db.Tag.createMany({
      data: toCreate.map((tag) => ({
        title: tag.title,
      })),
    });

    console.log(`🏷️ Seeding tags completed.`);
  } catch (error) {
    // Log error if seeding tags fails
    console.error('🚨🏷️ Error seeding tags:', error);
  }
}

const Tags = [
  { title: 'Technology' },
  { title: 'Health' },
  { title: 'Finance' },
  { title: 'Education' },
  { title: 'Entertainment' },
  { title: 'Travel' },
  { title: 'Food' },
  { title: 'Sports' },
  { title: 'Fashion' },
  { title: 'Lifestyle' },
];
