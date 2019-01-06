import GeoJSON from 'ol/format/geojson';
import Symbolizer from './symbolizers/Symbolizer';
import PolygonSymbolizer from './symbolizers/PolygonSymbolizer';
let turfhelper = require('@turf/helpers');
let turfbuffer = require('@turf/buffer');
let turfprojection = require('@turf/projection');

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

    console.log('FEATURE');
    console.log(turfhelper.point([-75.343, 39.984]));
    console.log(turfhelper.point([1847520.94, 6309563.27]));

    console.log(turfbuffer.default(turfhelper.point([-75.343, 39.984]), 500, {units: 'kilometers'}));
    console.log(turfbuffer.default(turfprojection.toWgs84(turfhelper.point([1847520.94, 6309563.27])), 500, {units: 'kilometers'}));

    for (let i in parsedFeatures) {
        parsedFeatures[i].setProperties({'geometry4326': 'Geometry test', 'mojevalue': 1234});
    }

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

    if (value_idx < 0) {
        throw new Error('Value_idx values must be >= 0');
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

    let parsedFeatures = new GeoJSON().readFeatures(features, {
        dataProjection: 'EPSG:3857',
        featureProjection: 'EPSG:3857',
    });

    // Min and max values for normalization
    let minMaxValues = {};

    properties.forEach(function(property) {
        minMaxValues[property.name_id] = {};
        minMaxValues[property.name_id]['min'] = Symbolizer.getMinValue(parsedFeatures, property.name_id);
        minMaxValues[property.name_id]['max'] = Symbolizer.getMaxValue(parsedFeatures, property.name_id);
    });
    console.log('MAXMINVALUES');
    console.log(minMaxValues);

    //console.log(parsedFeatures);

    // Caching the styles
    if (Object.keys(cachedFeatureStyles).length === 0) {
        let length = 0;
        parsedFeatures.forEach(function(feature) {

            properties.forEach(function(property) {
                if (feature.values_.hasOwnProperty(property.name_id)) {
                    length = feature.values_[property.name_id].values.length;
                }
            });

            for (let i = 0; i < length; i++) {
                let symbolizer = new Symbolizer(primary_property, properties, feature, i, resolution, minMaxValues);
                let featureStyle = symbolizer.createSymbol();
                //console.log(featureStyle);
                let hash = Symbolizer.createHash(feature.id_, primary_property, i);
                if (featureStyle instanceof Array) {
                    for (let j in featureStyle) {
                        featureStyle[j].getImage().load();
                    }
                } else {
                    featureStyle.getImage().load();
                }
                cachedFeatureStyles[hash] = featureStyle;
                //console.log('CACHED styles');
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
            let hash = Symbolizer.createHash(feature.id_, primary_property, value_idx);
            //console.log('hash');
            //console.log(hash);

            if (cachedFeatureStyles.hasOwnProperty(hash)) {
                //console.log('Vracim cachovany styl');
                //console.log(hash);
                return cachedFeatureStyles[hash]
            } else {
                //console.log('Necachovany styl');
                let symbolizer = new Symbolizer(primary_property, properties, feature, value_idx, resolution, minMaxValues);
                return symbolizer.createSymbol();
            }
        }
    };
}