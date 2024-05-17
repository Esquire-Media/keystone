import { MapboxFieldViewProps, Field as MapboxField } from "."

export function Field(props: MapboxFieldViewProps) {
    if (!props.field.ui) {
        props.field.ui = {
            initialViewState: {
                longitude: -78.90093,
                latitude: 35.99623,
                zoom: 15,
            },
            mapboxAccessToken: process.env.NEXT_PUBLIC_MAPBOX_TOKEN,
            mapStyle: process.env.NEXT_PUBLIC_MAPBOX_STYLE || ""
        }
    }
    return MapboxField(props)
}