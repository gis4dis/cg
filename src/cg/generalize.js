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
    // features.features.forEach(function (feature) {
    //     if (feature.properties.property_values.length !== feature.properties.property_anomaly_rates.length) {
    //         throw new Error('Property values and property anomaly rates has different length');
    //     }
    //
    //     if (feature.properties.value_index_shift < 0) {
    //         throw new Error('Value index shift must be >= 0');
    //     }
    // });

    if (value_idx < 0) {
        throw new Error('Value_idx values must be >= 0');
    }

    // Max and min values for normalization
    //TODO fix - should be maxMinValues
    let minMaxValues = {};
    /*
    properties.forEach(function (property) {
        if (!minMaxValues.hasOwnProperty(property.name_id)) {

            console.log(property.name_id);
            let maxPropertyValue = Symbolizer.getMaxValue(features, property.name_id, 'values');
            let minPropertyValue = Symbolizer.getMinValue(features, property.name_id, 'values');

            let maxAnomalyValue = Symbolizer.getMaxValue(features, property.name_id, 'anomaly_rates');
            let minAnomalyValue = Symbolizer.getMinValue(features, property.name_id, 'anomaly_rates');

            minMaxValues[property.name_id] = [maxPropertyValue, minPropertyValue, maxAnomalyValue, minAnomalyValue];
        }
    });
    */
    //console.log('Min and Max Values');
    //console.log(minMaxValues);

    //let maxPropertyValue = Symbolizer.getMaxValue(features, 'air_temperature', 'values');
    //let minPropertyValue = Symbolizer.getMinValue(features, 'air_temperature', 'values');

    //let maxAnomalyValue = Symbolizer.getMaxValue(features, 'air_temperature', 'anomaly_rates');
    //let minAnomalyValue = Symbolizer.getMinValue(features, 'air_temperature', 'anomaly_rates');

    // Caching the styles
    if (Object.keys(cachedFeatureStyles).length === 0) {
        let length = 0;
        features.features.forEach(function(feature) {

            //console.log(property);
            //console.log(feature);
            //console.log(feature.properties);
            properties.forEach(function(property) {
                if (feature.properties.hasOwnProperty(property.name_id)) {
                    length = feature.properties[property.name_id].values.length;
                }
            });

            for (let i = 0; i < length; i++) {
                let symbolizer = new Symbolizer(primary_property, properties, feature, i, resolution, minMaxValues, true);
                let featureStyle = symbolizer.createSymbol();
                //console.log('Feature na styl');
                //console.log(feature);
                let hash = Symbolizer.createHash(feature.id, i);
                featureStyle.getImage().load();
                cachedFeatureStyles[hash] = featureStyle;
                //console.log('cachedstyles');
                //console.log(cachedFeatureStyles);
            }
        });
    }

    return {
        features: new GeoJSON().readFeatures(features, {
            dataProjection: 'EPSG:3857',
            featureProjection: 'EPSG:3857',
        }),
        style: function (feature, resolution) {
            //console.log('All Features');
            //console.log(features);
            //console.log('OL FEATURE');
            //console.log(feature);

            let hash = Symbolizer.createHash(feature.id_, value_idx);

            //let hash = Symbolizer.createHash('air_temperature', feature.values_.air_temperature.values[value_idx], feature.values_.air_temperature.anomaly_rates[value_idx]);
            //console.log('hash nakonci');
            //console.log(hash);
            //console.log(cachedFeatureStyles);
            if (cachedFeatureStyles.hasOwnProperty(hash)) {
                //console.log('cachovany styl');
                //console.log(cachedFeatureStyles[hash]);
                return cachedFeatureStyles[hash]
            } else {
                let symbolizer = new Symbolizer(primary_property, properties, feature, value_idx, resolution, minMaxValues, false);
                return symbolizer.createSymbol();
            }
        }
    };
}