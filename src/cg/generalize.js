import GeoJSON from 'ol/format/geojson';
import Symbolizer from './symbolizers/Symbolizer';
import Feature from 'ol/feature';
import Polygon from 'ol/geom/polygon';
import Style from 'ol/style/style';
import Stroke from 'ol/style/stroke';
import Fill from 'ol/style/fill';
import PolygonSymbolizer from './symbolizers/PolygonSymbolizer';
import { findIntersection, addTurfGeometry, getMinMaxValues, getNewCentroid, updateTurfGeometry } from './helpers';
import PointGeneralizer from './symbolizers/PointGeneralizer';
import CombinedSymbol from './symbolizers/CombinedSymbol';

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
let buffers = {};

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

    // Sorting properties - primary property is top left box
    let sortedProperties = Symbolizer.sortProperties(properties, primary_property);

    // Adding geometry in WGS84 to OL feature because of computing using turf.js
    parsedFeatures = addTurfGeometry(parsedFeatures);

    // Min and max values for normalization
    let minMaxValues = getMinMaxValues(sortedProperties, parsedFeatures);

    for (let feature of parsedFeatures) {
        let combinedSymbol = new CombinedSymbol(feature, sortedProperties, primary_property, resolution, value_idx, minMaxValues);
        feature.setProperties({'combinedSymbol': combinedSymbol});
    }


    // Caching the styles
    /*if (Object.keys(cachedFeatureStyles).length === 0) {
        let length = 0;
        parsedFeatures.forEach(function(feature) {

            sortedProperties.forEach(function(property) {
                if (feature.values_.hasOwnProperty(property.name_id)) {
                    length = feature.values_[property.name_id].values.length;
                }
            });

            for (let i = 0; i < length; i++) {
                let hash = Symbolizer.createHash(feature.id_, primary_property, i);
                //console.log('HASH');
                //console.log(hash);
                // adding buffer from buffers object to feature
                feature.setProperties({'buffer': buffers[hash]});

                let symbolizer = new Symbolizer(primary_property, sortedProperties, feature, i, resolution, minMaxValues);
                let featureStyle = symbolizer.createSymbol();

                // adding style to a feature
                feature.setProperties({'featureStyle': featureStyle});

                //console.log('Feature');
                //console.log(feature);

                if (featureStyle instanceof Array) {
                    for (let j in featureStyle) {
                        featureStyle[j].getImage().load();
                    }
                } else {
                    featureStyle.getImage().load();
                }
                cachedFeatureStyles[hash] = featureStyle;
            }
        });
    }*/

    let intersectedFeatures = [];

    for (let feature of parsedFeatures) {
        feature.setProperties({'intersectedFeatures': []});
        for (let otherFeature of parsedFeatures) {

            if (feature.id_ !== otherFeature.id_) {

                if (findIntersection(feature, otherFeature)) {
                    feature.values_.intersectedFeatures.push(otherFeature);
                    feature.values_.combinedSymbol.aggregateSymbols(otherFeature.values_.combinedSymbol);

                    let newCoords = getNewCentroid(feature.getGeometry().getCoordinates(), otherFeature.getGeometry().getCoordinates());

                    feature.getGeometry().setCoordinates(newCoords);

                    parsedFeatures.splice(parsedFeatures.indexOf(otherFeature), 1);

                    updateTurfGeometry(feature);
                    feature.values_.combinedSymbol.setBuffer(feature, value_idx, minMaxValues);
                }
            }
        }
    }

    let bufferFeatures = [];
    for (let feature of parsedFeatures) {
        let featureTest = new Feature({
            name: 'buffer' + feature.id_,
            geometry: new Polygon(feature.values_.combinedSymbol.buffer.geometry.coordinates).transform('EPSG:4326', 'EPSG:3857')
        });
        let myStroke = new Stroke({
            color : 'rgba(255,0,0,1.0)',
            width : 2
        });
        featureTest.setStyle(new Style({stroke: myStroke}));
        bufferFeatures.push(featureTest);
    }

    return {
        features: parsedFeatures,
        style: function (feature, resolution) {
            let hash = Symbolizer.createHash(feature.id_, primary_property, value_idx);

            if (cachedFeatureStyles.hasOwnProperty(hash)) {
                return cachedFeatureStyles[hash]
            } else {
                let symbolizer = new Symbolizer(primary_property, sortedProperties, feature, value_idx, resolution, minMaxValues);
                return symbolizer.createSymbol();
            }
        }
    };
}