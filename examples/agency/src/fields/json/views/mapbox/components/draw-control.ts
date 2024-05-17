import MapboxDraw, {
  DrawCreateEvent,
  DrawDeleteEvent,
  DrawUpdateEvent,
} from "@mapbox/mapbox-gl-draw";
import { useControl, type ControlPosition } from "react-map-gl";
import { FeatureCollection } from "geojson";
import { MapContextValue } from "react-map-gl/dist/esm/components/map";

type DrawControlProps = ConstructorParameters<typeof MapboxDraw>[0] & {
  value?: FeatureCollection;
  position?: ControlPosition;
  onChange?: (featureCollection: FeatureCollection) => void;
};

export default function DrawControl(props: DrawControlProps) {
  const onChange = (
    event: DrawCreateEvent | DrawUpdateEvent | DrawDeleteEvent,
  ) => {
    props.onChange?.(
      // @ts-expect-error (TS2339) private member
      event.target._controls
        .find((e: object) => Object.keys(e).includes("getSelected"))
        .getAll(),
    );
  };
  const draw = new MapboxDraw(props);
  useControl<MapboxDraw>(
    () => draw,
    (context: MapContextValue) => {
      if (props.value) {
        draw.set(props.value);
      }
      context.map.on("draw.create", onChange);
      context.map.on("draw.update", onChange);
      context.map.on("draw.delete", onChange);
    },
    (context: MapContextValue) => {
      context.map.off("draw.create", onChange);
      context.map.off("draw.update", onChange);
      context.map.off("draw.delete", onChange);
    },
    {
      position: props.position,
    },
  );

  return null;
}
