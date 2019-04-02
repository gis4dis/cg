import GeoJSON from 'ol/format/geojson';
import Symbolizer from './symbolizers/Symbolizer';
import Feature from 'ol/feature';
import Point from 'ol/geom/point';
import {
    sortProperties,
    containsFeature,
    findIntersection,
    addTurfGeometry,
    getMinMaxValues,
    getNewCentroid,
    updateTurfGeometry
} from './helpers';
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
 * @returns {{features: Array.<Feature>, style: function()}}
 */
let cachedFeatureStyles = {};
/*
* FeatureId: {
*   wgs84: geometry in WGS84,
*   turfGeometry: geometry,
*   combinedSymbol: combinedSymbolObject
*   }
*   */
export let featureInfo = {};
//let buffers = {};

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
    let sortedProperties = sortProperties(properties, primary_property);

    // Adding geometry in WGS84 to OL feature because of computing using turf.js
    featureInfo = addTurfGeometry(parsedFeatures);

    // Min and max values for normalization
    let minMaxValues = getMinMaxValues(sortedProperties, parsedFeatures);

    for (let feature of parsedFeatures) {
        featureInfo[feature.getId()].combinedSymbol = new CombinedSymbol(feature, sortedProperties, primary_property, resolution, value_idx, minMaxValues);
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

    let aggFeatures = [];

    for (let feature of parsedFeatures) {
        for (let otherFeature of parsedFeatures) {
            if (feature.id_ !== otherFeature.id_) {
                if (findIntersection(feature, otherFeature)) {
                    let newCoords = getNewCentroid(feature.getGeometry().getCoordinates(), otherFeature.getGeometry().getCoordinates());

                    let aggFeature = new Feature({
                        intersectedFeatures: [],
                        geometry: new Point(newCoords)
                    });
                    aggFeature.setId(`agg_${feature.id_}:${otherFeature.id_}`);
                    aggFeature.values_.intersectedFeatures.push(feature);
                    aggFeature.values_.intersectedFeatures.push(otherFeature);

                    featureInfo[aggFeature.getId()] = {
                        'combinedSymbol': null,
                        'turfGeometry': null,
                        'wgs84': null
                    };
                    featureInfo[aggFeature.getId()].combinedSymbol = featureInfo[feature.getId()].combinedSymbol;
                    featureInfo[aggFeature.getId()].combinedSymbol.aggregateSymbols(featureInfo[otherFeature.getId()].combinedSymbol);

                    parsedFeatures.splice(parsedFeatures.indexOf(otherFeature), 1);
                    parsedFeatures.splice(parsedFeatures.indexOf(feature), 1);

                    updateTurfGeometry(aggFeature);
                    featureInfo[aggFeature.getId()].combinedSymbol.setBuffer(aggFeature, minMaxValues);

                    aggFeatures.push(aggFeature);

                    //add feature for next iteration and break the inner cycle
                    parsedFeatures.push(aggFeature);

                    break;
                }
            }
        }
    }

    // Removing features of multiple aggregation
    for (let feature of aggFeatures) {
        for (let otherFeature of aggFeatures) {
            if (feature.id_.includes(otherFeature.id_)) {
                aggFeatures.splice(aggFeatures.indexOf(otherFeature), 1);
            }
        }
    }

    // Copy features without intersection
    for (let feature of parsedFeatures) {
        if (!containsFeature(feature, aggFeatures)) {
            aggFeatures.push(feature);
        }
    }

    /*
    let bufferFeatures = [];
    for (let feature of parsedFeatures) {
        let featureTest = new Feature({
            name: 'buffer' + feature.id_,
            geometry: new Polygon(featureInfo[feature.getId()].combinedSymbol.buffer.geometry.coordinates).transform('EPSG:4326', 'EPSG:3857')
        });
        let myStroke = new Stroke({
            color : 'rgba(255,0,0,1.0)',
            width : 2
        });
        featureTest.setStyle(new Style({stroke: myStroke}));
        bufferFeatures.push(featureTest);
    }

    parsedFeatures.push(bufferFeatures[0]);
    parsedFeatures.push(bufferFeatures[1]);
    */

    return {
        features: aggFeatures,
        style: function (feature, resolution) {
            //TODO we don't need hash if we don't have caching
            //TODO try add caching on lower level of symbolization
            //let hash = Symbolizer.createHash(feature.id_, primary_property, value_idx);

            //if (cachedFeatureStyles.hasOwnProperty(hash)) {
            //    return cachedFeatureStyles[hash]
            //} else {
                let symbolizer = new Symbolizer(properties, feature, resolution, minMaxValues);
                return symbolizer.createSymbol();
            //}
        }
    };
}