import { KeystoneContext } from "@keystone-6/core/types";
import geojson from "./common/geoframes.json";

type GeoFrame = {
  ESQID: string,
  title?: string,
  city?: string,
  state?: string,
  zipCode?: string,
  polygon: string
}
/**
 * Seeds GeoFrame data in the database.
 * - Parses GeoJSON data to convert polygon strings to GeoJSON format.
 * - Checks the database for existing GeoFrames with the same ESQID.
 * - Creates new GeoFrames with the ESQIDs not already in the database.
 * 
 * @param {KeystoneContext} context - KeystoneJS context object, providing access to the database.
 */
export default async function seedGeoFrames(context: KeystoneContext) {
  try {
    console.log(`🌍 Seeding GeoFrames...`);

    const GeoFrames = (geojson as GeoFrame[]).map((record) => ({
      ...record,
      polygon: {
        type: "FeatureCollection",
        features: [JSON.parse(record.polygon)],
      },
    }));

    // Use the sudo context to bypass access control
    const { db, query } = context.sudo();

    // Find GeoFrames already in the database by their ESQID
    const alreadyInDatabase = await db.TargetingGeoFrame.findMany({
      where: { ESQID: { in: GeoFrames.map((x) => x.ESQID) } },
    });

    // Determine which GeoFrames need to be created by filtering out already existing ones
    const toCreate = GeoFrames.filter(
      (seed) => !alreadyInDatabase.some((x) => x.ESQID === seed.ESQID)
    );

    await query.TargetingGeoFrame.createMany({
      data: toCreate
    });

    console.log(`🌍 Seeding GeoFrames completed.`);
  } catch (error) {
    // Log error if seeding GeoFrames fails
    console.error('🚨🌍 Error seeding GeoFrames:', error);
  }
}
