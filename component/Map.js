import React from 'react';
import ol_format_GeoJSON from 'ol/format/geojson';
import generalize from './../src/cg/generalize';

const geojson = require('./../data/big_percentiles.json');
const geojson_example = require('../data/big_percentiles.json');
const geojsonFeatures = (new ol_format_GeoJSON()).readFeatures(geojson, {
    dataProjection: 'EPSG:3857',
    featureProjection: 'EPSG:3857',
});
const vgi_data = require('./../data/vgi_data');


let ol_Map;
let ol_View;
let ol_control_ScaleLine;
let ol_interaction;
let ol_layer_Tile;
let ol_layer_Vector;
let ol_proj;
let ol_source_OSM;
let ol_source_Vector;

let projection;
const cfg = {
    projection: 'EPSG:3857',
};

const getBaselayer = () => {
    const baselayer = new ol_layer_Tile({
        source: new ol_source_OSM()
    });
    return baselayer;
};

const getVectorLayer = () => {
    const vectorSrc = new ol_source_Vector({
        features: geojsonFeatures
    });

    const vectorLayer = new ol_layer_Vector({
        source: vectorSrc,
    });

    return vectorLayer;
};

class Map extends React.PureComponent {
    mapel;

    constructor(props) {
        super(props);
        this.state = {
            map: null,
        };
    }

    render() {
        return (
            <div className="map-wrap">
                <div className="map" ref={(d) => this.mapel = d}></div>
                <style jsx>{`
.map-wrap, .map {
  width: 100%;
  height: 100%;
}
@media (max-width:600px) {
  .map-wrap {
    height: 100%;
    padding-bottom: 4rem;
  }
}
`}</style>
            </div>
        );
    }

    componentDidMount() {
        let testGeneralizeObject = generalize({
            topic: {
                "name": "drought",
                "name_id": "drought"
            },
            properties: [
                {
                    "name_id": "air_temperature",
                    "name": "air temperature",
                    "unit": "°C"
                },
                {
                    "name_id": "pm10",
                    "name": "PM10",
                    "unit": "µg/m³"
                },
                {
                    "name_id": "precipitation",
                    "name": "precipitation",
                    "unit": "mm"
                },
                {
                    "name_id": "stream_flow",
                    "name": "stream flow",
                    "unit": "m³/s"
                }
            ],
            primary_property: "air_temperature",
            features: geojson_example,
            vgi_data: vgi_data,
            value_idx: 0,
            resolution: 76.437 //4.777 for zoom 15 --- 19.109 for zoom 13 -- 38.218 for zoom 12 -- 76.437 for zoom 11 -- 305.748 for zoom 9
        });

        ol_Map = require('ol/map').default;
        ol_View = require('ol/view').default;
        ol_control_ScaleLine = require('ol/control/scaleline').default;
        ol_interaction = require('ol/interaction').default;
        ol_layer_Tile = require('ol/layer/tile').default;
        ol_layer_Vector = require('ol/layer/vector').default;
        ol_proj = require('ol/proj').default;
        ol_source_OSM = require('ol/source/osm').default;
        ol_source_Vector = require('ol/source/vector').default;

        projection = ol_proj.get(cfg.projection);

        const view = new ol_View({
            projection: projection,
            center: ol_proj.transform([16.6078411,49.2002211], 'EPSG:4326', projection),
            zoom:11
        });

        const vectorLayer = getVectorLayer();
        const baselayer = getBaselayer();
        const vectorTestLayer = new ol_layer_Vector({
            source: new ol_source_Vector({
                features: testGeneralizeObject.features
            }),
            style: testGeneralizeObject.style,
        });

        const map = new ol_Map({
            controls: [new ol_control_ScaleLine()],
            target: this.mapel,
            layers: [
                baselayer,
                vectorTestLayer,
            ],
            view: view,
            interactions: ol_interaction.defaults({
                doubleClickZoom: false
            })
        });

        this.setState({
            map
        });

    }


}

export default Map;
