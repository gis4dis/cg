import React from 'react';
import ol_format_GeoJSON from 'ol/format/geojson';
import generalize from './../src/cg/generalize';

const geojson = require('./../data/test.json');
const geojsonFeatures = (new ol_format_GeoJSON()).readFeatures(geojson, {
  dataProjection: 'EPSG:4326',
  featureProjection: 'EPSG:3857',
});

generalize({
    property: {
        "properties": [
            {
                "name_id": "air_temperature",
                "name": "air temperature",
                "unit": "°C"
            },
            {
                "name_id": "ground_air_temperature",
                "name": "ground air temperature",
                "unit": "°C"
            },
            {
                "name_id": "soil_temperature",
                "name": "soil temperature",
                "unit": "°C"
            },
            {
                "name_id": "precipitation",
                "name": "precitipation",
                "unit": "mm"
            },
            {
                "name_id": "air_humidity",
                "name": "air humidity",
                "unit": "%"
            }
        ]
    },
    features: {
        "type": "FeatureCollection",
        "crs": { "type": "name", "properties": { "name": "urn:ogc:def:crs:EPSG::3857" } },

        "features": [
            { "type": "Feature", "properties": { "OBJECTID": "56", "TYP": 1, "NAZEV": "Karlovy Vary", "NAZEV_ASCII": "Karlovy Vary", "ICAO": "LKKV", "STATUT": 1 }, "geometry": { "type": "Point", "coordinates": [ 1437382.341375914867967, 6481276.896847307682037 ] } },
            { "type": "Feature", "properties": { "OBJECTID": "42", "TYP": 1, "NAZEV": "Žatec\/Macerka", "NAZEV_ASCII": "Zatec\/Macerka", "ICAO": "LKZD", "STATUT": 2 }, "geometry": { "type": "Point", "coordinates": [ 1505265.76257231971249, 6501951.089260200969875 ] } },
            { "type": "Feature", "properties": { "OBJECTID": "9", "TYP": 1, "NAZEV": "Toužim", "NAZEV_ASCII": "Touzim", "ICAO": "LKTO", "STATUT": 2 }, "geometry": { "type": "Point", "coordinates": [ 1441769.363890942186117, 6461716.906749850139022 ] } }
        ]
    },
    value_idx: 1,
    resolution: 10
});

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
        <div className="map" ref={(d) => this.mapel = d}> </div>
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
      center: ol_proj.transform([16.62, 49.2], 'EPSG:4326', projection),
      zoom: 11
    });


    const vectorLayer = getVectorLayer();
    const baselayer = getBaselayer();

    const map = new ol_Map({
      controls: [new ol_control_ScaleLine()],
      target: this.mapel,
      layers: [
          baselayer,
          vectorLayer
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
