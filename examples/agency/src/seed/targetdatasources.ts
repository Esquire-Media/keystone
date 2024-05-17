import { KeystoneContext } from "@keystone-6/core/types";
import { JSONify } from "./common";
import filters from "./common/filters";

/**
 * Seeds targeting data sources in the database.
 * - Identifies existing data sources by their titles.
 * - Creates new data sources with unique titles.
 * - Includes filtering criteria for each data source.
 * 
 * @param {KeystoneContext} context - KeystoneJS context object, providing access to the database.
 */
export default async function seedTargetingDataSources(context: KeystoneContext) {
  try {
    console.log(`🎯 Seeding targeting data sources...`);

    // Use the sudo context to bypass access control
    const { db } = context.sudo();

    // Find data sources already in the database by their title
    const alreadyInDatabase = await db.TargetingDataSource.findMany({
      where: { title: { in: DataSources.map((x) => x.title) } },
    });

    // Determine which data sources need to be created by filtering out already existing ones
    const toCreate = DataSources.filter(
      (seed) => !alreadyInDatabase.some((x) => x.title === seed.title)
    );

    // Create new data sources
    await db.TargetingDataSource.createMany({
      data: toCreate.map((dataSource) => ({
        title: dataSource.title,
        dataType: dataSource.dataType,
        filtering: dataSource.filtering,
      })),
    });

    console.log(`🎯 Seeding targeting data sources completed.`);
  } catch (error) {
    // Log error if seeding targeting data sources fails
    console.error('🚨🎯 Error seeding targeting data sources:', error);
  }
}

const DataSources = [
  {
    title: "Custom GeoFrames",
    dataType: "polygons",
    filtering: JSONify({
      id: {
        label: "ID",
        type: "text",
      },
      esqid: {
        label: "ESQ ID (Legacy)",
        type: "text",
      },
      name: {
        label: "Name",
        type: "text",
      },
      ...filters.simple_address,
    }),
  },
  {
    title: "Residential Addresses",
    dataType: "addresses",
    filtering: JSONify({
      ID: {
        label: "ID",
        type: "text",
      },
      FIPS: {
        label: "FIPS",
        type: "text",
      },
      datePublished: {
        label: "Meta: Date Published",
        type: "datetime",
      },
      ...filters.address,
    }),
  },
  {
    title: "Movers Data",
    dataType: "addresses",
    filtering: JSONify({
      ...filters.address,
      date: {
        label: "Meta: Date Published",
        type: "datetime",
      },
      homeOwnership: {
        label: "Demographics: Home Ownership",
        type: "select",
        valueSources: ["value"],
        fieldSettings: {
          listValues: [
            { value: "None" },
            { value: "HomeOwner" },
            { value: "ProbableHomeOwner" },
            { value: "ProbableRenter" },
            { value: "Renter" },
          ],
        },
      },
      addressType: {
        label: "Demographics: Address Type",
        type: "select",
        valueSources: ["value"],
        fieldSettings: {
          listValues: [
            { value: "None" },
            { value: "Highrise" },
            { value: "SingleFamily" },
          ],
        },
      },
      estimatedIncome: {
        label: "Demographics: Estimated Income",
        type: "number",
      },
      estimatedHomeValue: {
        label: "Demographics: Estimated Home Value",
        type: "number",
      },
      estimatedAge: {
        label: "Demographics: Estimated Age",
        type: "number",
      },
    }),
  },
  {
    title: "Existing Targetings",
    dataType: "device_ids",
    filtering: JSONify({
      id: {
        label: "ID",
        type: "text",
      },
      tags: {
        label: "Tags",
        type: "text",
      },
    }),
  },
  {
    title: "Sales Data",
    dataType: "addresses",
    filtering: JSONify({
      ...filters.address,
      client: {
        label: "Client",
        type: "text",
      },
      date: {
        label: "Transaction Date",
        type: "datetime",
      },
    }),
  },
  {
    title: "Points of Interest",
    dataType: "addresses",
    filtering: JSONify({
      ...filters.address,
    }),
  },
  {
    title: "Building Footprints",
    dataType: "polygons",
    filtering: JSONify({
      ...filters.address,
    }),
  },
]