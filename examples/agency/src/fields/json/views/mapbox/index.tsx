/** @jsxRuntime classic */
/** @jsx jsx */
import { jsx } from "@keystone-ui/core";
import "./components/css/mapbox-gl-geocoder.css"
import "./components/css/mapbox-gl-draw.css"
import "./components/css/mapbox-gl-draw-v2.css"
import React, { useCallback } from "react";
import { type FieldProps } from '@keystone-6/core/types'
import { type controller } from '@keystone-6/core/fields/types/json/views'
import Mapbox, { LngLatBoundsLike, ViewState } from "react-map-gl";
import Maplibre from "react-map-gl/maplibre";
import GeocoderControl from "./components/geocoder-control";
import DrawControl from "./components/draw-control";
import { FeatureCollection } from "geojson";
import * as turf from "@turf/turf";

export type ViewProps = FieldProps<typeof controller>

// Enforces `field` to have `displayMode` as 'geojson'
export type MapboxFieldViewProps = ViewProps & {
  field: {
    ui: {
      mapStyle: string;
      initialViewState?: Partial<ViewState>;
      mapboxAccessToken?: string;
    }
  };
};

export function Field(props: MapboxFieldViewProps) {
  // Deserialize the current value
  const value = props.value
    ? (JSON.parse(props.value) as FeatureCollection)
    : undefined;

  // Serialize the FeatureCollection and pass the results back to the field handler
  const onChange = useCallback((value: FeatureCollection) => {
    props.onChange ? props.onChange(JSON.stringify(value)) : null;
  }, []);

  // If a Mapbox access token is provided, use the Mapbox library otherwise, use Maplibre
  return props.field.ui.mapboxAccessToken ? (
    <Mapbox
      style={{ width: "100%", height: 400 }}
      mapStyle={props.field.ui.mapStyle}
      mapboxAccessToken={props.field.ui.mapboxAccessToken}
      initialViewState={
        value
          ? { bounds: value ? paddedbbox(value, 0.1) : undefined }
          : props.field.ui.initialViewState
      }
    >
      <DrawControl
        value={value}
        onChange={onChange}
        position="top-right"
        displayControlsDefault={false}
        controls={{
          polygon: true,
          trash: true,
        }}
        defaultMode="simple_select"
      />
      <GeocoderControl
        mapboxAccessToken={props.field.ui.mapboxAccessToken}
        position="top-left"
      />
    </Mapbox>
  ) : (
    <Maplibre
      mapStyle={props.field.ui.mapStyle}
      initialViewState={props.field.ui.initialViewState}
    >
      <DrawControl
        value={value}
        onChange={onChange}
        position="top-right"
        displayControlsDefault={false}
        controls={{
          polygon: true,
          trash: true,
        }}
        defaultMode="simple_select"
      />
    </Maplibre>
  );
}

/**
 * Pads a bounding box by a specified percentage of its size.
 *
 * @param {FeatureCollection} featureCollection - The FeatureCollection to calculate the bbox for.
 * @param {number} paddingPercentage - The percentage by which to pad the bbox, expressed as a decimal (e.g., 10% = 0.1).
 * @returns {LngLatBoundsLike } A new bounding box array padded by the specified percentage.
 */
function paddedbbox(
  featureCollection: FeatureCollection,
  paddingPercentage: number,
): LngLatBoundsLike {
  // Calculate the bounding box of the FeatureCollection
  const bbox = turf.bbox(featureCollection);

  // Calculate dimensions of the original bbox
  const width = bbox[2] - bbox[0]; // maxLongitude - minLongitude
  const height = bbox[3] - bbox[1]; // maxLatitude - minLatitude

  // Calculate padding amounts
  const paddingWidth = width * paddingPercentage;
  const paddingHeight = height * paddingPercentage;

  // Create a new, padded bbox
  const paddedBbox: LngLatBoundsLike = [
    bbox[0] - paddingWidth, // minLongitude
    bbox[1] - paddingHeight, // minLatitude
    bbox[2] + paddingWidth, // maxLongitude
    bbox[3] + paddingHeight, // maxLatitude
  ];

  return paddedBbox;
}
