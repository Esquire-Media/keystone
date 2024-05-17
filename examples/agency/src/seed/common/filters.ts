import common from ".";

const filters = {
  simple_address: {
    street: {
      label: "Address: Street ",
      type: "text",
    },
    city: {
      label: "Address: City",
      type: "text",
    },
    state: {
      label: "Address: State",
      type: "select",
      valueSources: ["value"],
      fieldSettings: {
        listValues: common.listValues.states,
      },
    },
    zipCode: {
      label: "Address: Zip Code",
      type: "text",
    },
  },
  address: {
    primaryNumber: {
      label: "Address: Primary Number",
      type: "text",
    },
    streetPredirection: {
      label: "Address: Pre-Direction",
      type: "select",
      valueSources: ["value"],
      fieldSettings: {
        listValues: common.listValues.cardinalDirections,
      },
    },
    streetName: {
      label: "Address: Street Name",
      type: "text",
    },
    streetSuffix: {
      label: "Address: Street Suffix",
      type: "select",
      valueSources: ["value"],
      fieldSettings: {
        listValues: common.listValues.streetSuffixes,
      },
    },
    streetPostdirection: {
      label: "Address: Post-Direction",
      type: "select",
      valueSources: ["value"],
      fieldSettings: {
        listValues: common.listValues.cardinalDirections,
      },
    },
    secondaryDesignator: {
      label: "Address: Secondary Designator",
      type: "text",
    },
    secondaryNumber: {
      label: "Address: Secondary Number",
      type: "text",
    },
    city: {
      label: "Address: City",
      type: "text",
    },
    state: {
      label: "Address: State",
      type: "select",
      valueSources: ["value"],
      fieldSettings: {
        listValues: common.listValues.states,
      },
    },
    zipCode: {
      label: "Address: Zip Code",
      type: "text",
    },
    plus4Code: {
      label: "Address: +4 Code",
      type: "text",
    },
    latitude: {
      label: "Geography: Latitude",
      type: "number",
    },
    longitude: {
      label: "Geography: Longitude",
      type: "number",
    },
    h3_index: {
      label: "Geography: H3 (7)",
      type: "text",
    },
  },
};

export default filters;
