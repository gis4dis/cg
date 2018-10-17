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

    properties.forEach(function (property) {
        if (!minMaxValues.hasOwnProperty(property.name_id)) {

            let maxPropertyValue = Symbolizer.getMaxValue(features, property.name_id, 'values');
            let minPropertyValue = Symbolizer.getMinValue(features, property.name_id, 'values');

            let maxAnomalyValue = Symbolizer.getMaxValue(features, property.name_id, 'anomaly_rates');
            let minAnomalyValue = Symbolizer.getMinValue(features, property.name_id, 'anomaly_rates');

            minMaxValues[property.name_id] = [maxPropertyValue, minPropertyValue, maxAnomalyValue, minAnomalyValue];
        }
    });

    console.log('Min and Max Values');
    console.log(minMaxValues);

    //let maxPropertyValue = Symbolizer.getMaxValue(features, 'air_temperature', 'values');
    //let minPropertyValue = Symbolizer.getMinValue(features, 'air_temperature', 'values');

    //let maxAnomalyValue = Symbolizer.getMaxValue(features, 'air_temperature', 'anomaly_rates');
    //let minAnomalyValue = Symbolizer.getMinValue(features, 'air_temperature', 'anomaly_rates');

    // Caching the styles
    if (Object.keys(cachedFeatureStyles).length === 0) {
        features.features.forEach(function (feature) {

            let id = feature.id;
            console.log('ID cachovani featuru');
            console.log(feature.id);

            properties.forEach(function (property) {
                console.log('property');
                console.log(property);
                let nameId = property.name_id;

                let propertyValues = feature.properties[property.name_id];
                console.log('property_values');
                console.log(feature.properties[property.name_id]);

                for (let i = 0; i < propertyValues.values.length; i++) {
                    let symbolizer = new Symbolizer(primary_property, feature, i, resolution, minMaxValues, true);
                    console.log('Feature na styl');
                    console.log(feature);
                    const featureStyle = symbolizer.styleBasedOnProperty();
                    let hash = Symbolizer.createHash(id, nameId, i, propertyValues.values[i], propertyValues.anomaly_rates[i]);
                    featureStyle.getImage().load();
                    cachedFeatureStyles[hash] = featureStyle;
                    console.log('FeatureStyles');
                    console.log(cachedFeatureStyles);
                }
            });
        });
    }

    //TODO zkontrolovat jestli se neseká Chrome kdyz vytvarim symbologii dopredu casove rady

    return {
        features: new GeoJSON().readFeatures(features, {
            dataProjection: 'EPSG:3857',
            featureProjection: 'EPSG:3857',
        }),
        style: function (feature, resolution) {
            console.log('OL FEATURE');
            console.log(feature);
            //TODO fix air_temperature, make it for more properties
            let hash = Symbolizer.createHash(feature.id_, 'air_temperature', value_idx, feature.values_.air_temperature.values[value_idx], feature.values_.air_temperature.anomaly_rates[value_idx]);
            console.log('hash nakonci');
            console.log(hash);
            if (cachedFeatureStyles.hasOwnProperty(hash)) {
                console.log('cachovany styl');
                return cachedFeatureStyles[hash]
            } else {
                let symbolizer = new Symbolizer(primary_property, feature, value_idx, resolution, minMaxValues, false);
                return symbolizer.styleBasedOnProperty();
            }
        }
    };
}