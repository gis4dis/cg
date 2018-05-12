import ol_format_GeoJSON from 'ol/format/geojson';
const geojson = require('./../../data/test.json');

export default () => {
  const features = (new ol_format_GeoJSON()).readFeatures(geojson, {
    dataProjection: 'EPSG:4326',
    featureProjection: 'EPSG:3857',
  });
  features.forEach(feature => {
    console.log(feature.get('name'), feature.getGeometry().getExtent());
  });
}