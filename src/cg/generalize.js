import ol_format_GeoJSON from "ol/format/geojson";
import Fill from "ol/style/fill";
import Stroke from "ol/style/stroke";
import Icon from 'ol/style/icon';
import Style from 'ol/style/style';

let Symbolizer = require('./Symbolizer.js').default;
//let Cluster = require('./Cluster.js').default;

export default ({property, features, value_idx, resolution}) => {

    console.log(features);
    //TODO add other assurance checks
    if (features === null) {
        return {
            features: [],
            style: null
        }
    }

    if (property === null) {
        throw new Error('Property not provided');
    }

    return {
        features: new ol_format_GeoJSON().readFeatures(features, {
                dataProjection: 'EPSG:4326',
                featureProjection: 'EPSG:3857',
        }),
        style: function(feature, resolution) {
            let symbolizer = new Symbolizer(property, feature, value_idx, resolution);
            return symbolizer.styleBasedOnProperty();
        }
    };
}