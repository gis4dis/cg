import GeoJSON from 'ol/format/geojson';
import Symbolizer from './Symbolizer';
//import Cluster from './Cluster';

/**
 * Main generalization function
 * @param {Object.<string, string>} property - values selected by user
 *  (https://github.com/gis4dis/mc-client/blob/e7e4654dbd4f4b3fb468d4b4a21cadcb1fbbc0cf/static/data/properties.json)
 * @param {Object.GeoJSON} features - represented as Array of GeoJSON Features, each of them includes attributes
 *  (https://github.com/gis4dis/cg/blob/master/data/example.json)
 * @param {number} value_idx - an index of value that should be used for generalization
 * @param {number} resolution - number, represents projection units per pixel (the projection is EPSG:3857)
 *  (https://github.com/gis4dis/poster/wiki/Interface-between-MC-client-&-CG)
 * @returns {{features: Array.<_ol_feature>, style: _ol_StyleFunction}}
 */
export default ({property, features, value_idx, resolution}) => {

    // Assurance checks
    if (property === null) {
        throw new Error('Property not provided');
    }

    if (features === null) {
        return {
            features: [],
            style: null
        }
    }

    features.features.forEach(function (feature) {
        if (feature.properties.property_values.length !== feature.properties.property_anomaly_rates.length) {
            throw new Error('Property values and property anomaly rates has different length');
        }

        if (feature.properties.value_index_shift < 0) {
            throw new Error('Value index shift must be >= 0');
        }
    });

    if (value_idx < 0) {
        throw new Error('Value_idx values must be >= 0');
    }

    return {
        features: new GeoJSON().readFeatures(features, {
            dataProjection: 'EPSG:4326',
            featureProjection: 'EPSG:3857',
        }),
        style: function (feature, resolution) {
            let symbolizer = new Symbolizer(property, feature, value_idx, resolution);
            return symbolizer.styleBasedOnProperty();
        }
    };
}