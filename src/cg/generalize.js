import GeoJSON from 'ol/format/geojson';
import Symbolizer from './symbolizers/Symbolizer';
import PolygonSymbolizer from './symbolizers/PolygonSymbolizer';
import CachedSymbolizer from './symbolizers/CachedSymbolizer';

/**
 * Main generalization function
 * https://github.com/gis4dis/poster/wiki/Interface-between-MC-client-&-CG-v2
 * @param {Object.<string, string>} topic - topic that is selected by user, e.g. drought or flood
 * @param {Object.<string>} primary_property - name_id of one of properties that is selected by the user
 * @param {Object.<string, string, string>} properties - properties related to the topic whose timeseries are contained within features
 * @param {Object.GeoJSON} features - represented as Array of GeoJSON Features, each of them includes attributes
 *  (https://github.com/gis4dis/poster/wiki/Interface-between-MC-client-&-MC-server-v2#timeseries)
 * @param {number} value_idx - an index of value that should be used for generalization
 * @param {number} resolution - number, represents projection units per pixel (the projection is EPSG:3857)
 *  (https://github.com/gis4dis/poster/wiki/Interface-between-MC-client-&-CG)
 * @returns {{features: Array.<_ol_feature>, style: _ol_StyleFunction}}
 */
let cachedFeatureStyles = {};

export default ({topic, primary_property, properties, features, value_idx, resolution}) => {

    // Assurance checks
    if (primary_property === null) {
        throw new Error('Property not provided');
    }

    if (resolution === null) {
        throw new Error('Resolution not provided');
    }

    if (features === null) {
        return {
            features: [],
            style: null
        }
    }

    //TODO create tests for property_values and property_anomaly_rates
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

    // Max and min values for normalization
    let maxPropertyValue = Symbolizer.getMaxValue(features, 'property_values');
    let minPropertyValue = Symbolizer.getMinValue(features, 'property_values');

    let maxAnomalyValue = Symbolizer.getMaxValue(features, 'property_anomaly_rates');
    let minAnomalyValue = Symbolizer.getMinValue(features, 'property_anomaly_rates');

    // Caching the styles
    if (Object.keys(cachedFeatureStyles).length === 0) {
        features.features.forEach(function (feature) {
            let providerId = feature.properties.id_by_provider;
            let property_values = feature.properties.property_values;
            let cachedStyles = [];

            for (let i = 0; i < property_values.length; i++) {
                let cachedSymbolizer = new CachedSymbolizer(property, feature, i, resolution, maxPropertyValue, minPropertyValue, maxAnomalyValue, minAnomalyValue);
                const featureStyle = cachedSymbolizer.styleBasedOnProperty();
                featureStyle.getImage().load();
                cachedStyles.push(featureStyle);
                cachedFeatureStyles[feature.properties.id_by_provider] = cachedStyles;
            }
        });
    }

    return {
        features: new GeoJSON().readFeatures(features, {
            dataProjection: 'EPSG:3857',
            featureProjection: 'EPSG:3857',
        }),
        style: function (feature, resolution) {
            let providerId = feature.values_.id_by_provider;
            if (cachedFeatureStyles.hasOwnProperty(providerId)) {
                return cachedFeatureStyles[providerId][value_idx]
            } else {
                let symbolizer = new Symbolizer(property, feature, value_idx, resolution,
                    maxPropertyValue, minPropertyValue, maxAnomalyValue, minAnomalyValue);
                return symbolizer.styleBasedOnProperty();
            }
        }
    };
}