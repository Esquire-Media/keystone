import { KeystoneContext } from "@keystone-6/core/types";
import { getUniqueObjectsByKey } from '../schema/utils';

/**
 * Seeds user data in the database.
 * - Filters out duplicate emails from the author data.
 * - Checks the database for already existing users with those emails.
 * - Creates new users with the remaining emails that are not yet in the database.
 * 
 * @param {Context} context - KeystoneJS context object, providing access to the database.
 */
export default async function seedUsers(context: KeystoneContext) {
  try {
    console.log(`👨‍👩‍👧 Seeding users...`);

    // Retrieve a unique list of users by their email from the example author data
    const users = getUniqueObjectsByKey(authors, 'email');

    // Use the sudo context to bypass access control
    const { db } = context.sudo();

    // Find users already in the database by their email
    const alreadyInDatabase = await db.User.findMany({
      where: { email: { in: users.map((x) => x.email) } },
    });

    // Determine which users need to be created by filtering out already existing ones
    const toCreate = users.filter(
      (seed) => !alreadyInDatabase.some((x) => x.email === seed.email)
    );

    // Create new users with a default password
    await db.User.createMany({
      data: toCreate.map(x => ({ ...x, password: 'password' }))
    });

    console.log(`👨‍👩‍👧 Seeding users completed.`);
  } catch (error) {
    // Log error if seeding users fails
    console.error('🚨👨‍👩‍👧 Error seeding users:', error);
  }
}

export const authors = [
  { name: 'Arthur Conan Doyle', email: 'arthur.cd@email.com' },
  { name: 'Emily Brontë', email: 'emily.b@email.com' },
  { name: 'Jane Austen', email: 'austen.j@email.com' },
  { name: 'Daren Shipley', email: 'austen.j@email.com' },
  { name: 'Lewis Carroll', email: 'lewis.carroll@email.com' },
  { name: 'George Eliot', email: 'g.eliot@email.com' },
  { name: 'L. Frank Baum', email: 'l.baum@email.com' },
  { name: 'Mark Twain', email: 'mark.twain@email.com' },
  { name: 'Agatha Christie', email: 'agatha.christie@email.com' },
  { name: 'Jules Verne', email: 'jules.verne@email.com' },
  { name: 'H. G. Wells', email: 'hg.wells@email.com' },
  { name: 'Charles Dickens', email: 'charles.dickens@email.com' },
  { name: 'F. Scott Fitzgerald', email: 'f.scott.fitzgerald@email.com' },
  { name: 'James Joyce', email: 'james.joyce@email.com' },
  { name: 'Virginia Woolf', email: 'virginia.woolf@email.com' },
  { name: 'Homer', email: 'homer@email.com' },
  { name: 'Leo Tolstoy', email: 'leo.tolstoy@email.com' },
  { name: 'Fyodor Dostoevsky', email: 'fyodor.dostoevsky@email.com' },
  { name: 'Ernest Hemingway', email: 'ernest.hemingway@email.com' },
  { name: 'Gabriel Garcia Marquez', email: 'gabriel.gm@email.com' },
  { name: 'J. R. R. Tolkien', email: 'tolkien.jrr@email.com' },
  { name: 'Franz Kafka', email: 'franz.kafka@email.com' },
  { name: 'Herman Melville', email: 'herman.melville@email.com' },
  { name: 'Mary Shelley', email: 'mary.shelley@email.com' },
  { name: 'Haruki Murakami', email: 'haruki.murakami@email.com' },
  { name: 'Maya Angelou', email: 'maya.angelou@email.com' },
  { name: 'Kurt Vonnegut', email: 'kurt.vonnegut@email.com' },
  { name: 'Margaret Atwood', email: 'margaret.atwood@email.com' },
  { name: 'Ray Bradbury', email: 'ray.bradbury@email.com' },
  { name: 'Isaac Asimov', email: 'isaac.asimov@email.com' },
  { name: 'George Orwell', email: 'george.orwell@email.com' },
  { name: 'Toni Morrison', email: 'toni.morrison@email.com' }
];