import Style from 'ol/style/style';
import Stroke from 'ol/style/stroke';
import Fill from 'ol/style/fill';
import GeoJSON from 'ol/format/geojson';
import Symbolizer from './symbolizers/Symbolizer';
import VGISymbolizer from './symbolizers/VGISymbolizer';
import Feature from 'ol/feature';
import Point from 'ol/geom/point';
import {
    sortProperties,
    containsFeature,
    findIntersection,
    addFeatureInfo,
    getMinMaxValues,
    getNewCentroid,
    updateTurfGeometry,
    aggregateVgiToPolygon,
    addCrossreferences,
    addVgiFeatures,
    addFeatureToIndex,
    addFeaturesToIndex,
    getNewFeatures,
    recursiveAggregating
} from './helpers';
import CombinedSymbol from './symbolizers/CombinedSymbol';
import PolygonSymbolizer from "./symbolizers/PolygonSymbolizer";

import RBush from 'rbush';
import knn from 'rbush-knn';

let turfprojection = require('@turf/projection');
let turfhelper = require('@turf/helpers');

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
//let cachedFeatureStyles = {};
/*
* FeatureId: {
*   wgs84: geometry in WGS84,
*   turfGeometry: geometry,
*   combinedSymbol: combinedSymbolObject
*   }
*   */
export let featureInfo = {};
export let splicedFeatures = [];

//let buffers = {};
class PointRBush extends RBush {
    toBBox(item) { return {minX: item.x, minY: item.y, maxX: item.x, maxY: item.y}; }
    compareMinX(a, b) { return a.x - b.x; }
    compareMinY(a, b) { return a.y - b.y; }
}

export const tree = new PointRBush(5);

export default ({topic, primary_property, properties, features, vgi_data, value_idx, resolution}) => {


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

    let vgiFeatures = [];
    if (vgi_data !== undefined) {
        vgiFeatures = new GeoJSON().readFeatures(vgi_data, {
            dataProjection: 'EPSG:4326',
            featureProjection: 'EPSG:3857',
        });

        for (let feature of vgiFeatures) {
            feature.setId(`vgi_${feature.getId()}`);
        }
    }

    let parsedFeatures = new GeoJSON().readFeatures(features, {
        dataProjection: 'EPSG:3857',
        featureProjection: 'EPSG:3857',
    });
    //console.log(parsedFeatures);

    // Find new features. Features that are not inside the featureInfo. These features will be used for indexing
    //TODO pravdepodobne i vgi featury
    let newFeatures = getNewFeatures(parsedFeatures);

    // Adding features into PointRBush index
    addFeaturesToIndex(newFeatures);
    //console.log(tree);

    // Adding geometry in WGS84 to OL feature because of computing using turf.js
    // Added to featureInfo variable
    addFeatureInfo(newFeatures);

    // Sorting properties - primary property is top left box
    let sortedProperties = sortProperties(properties, primary_property);

    // Min and max values for normalization
    let minMaxValues = getMinMaxValues(sortedProperties, parsedFeatures);

    // Adding combinedSymbol into featureInfo variable
    // TODO tady bych si mohl nastavit jinak hodnotu abych nemusel vzdycky vytvaret CombinedSymbol
    splicedFeatures = [...parsedFeatures];

    for (let feature of parsedFeatures) {
        featureInfo[feature.getId()].combinedSymbol = new CombinedSymbol(feature, sortedProperties, primary_property, resolution, value_idx, minMaxValues);
    }

    // Aggregating of the features
    let aggFeatures = [];
    let a = performance.now();

    //TODO pridat tady i VGI az je budu agregovat
    for (let feature of parsedFeatures) {
        let coordinates = feature.getGeometry().getCoordinates();
        //TODO pocitat realnou vzdalenost podle velikosti symbolu

        // Find two features - one as query feature and the nearest feature to the query feature
        let indexedFeatures = knn(tree, coordinates[0], coordinates[1], 2, undefined, 1500);

        if (indexedFeatures[1] !== undefined) {
            let aggFeature = recursiveAggregating(indexedFeatures[0], indexedFeatures[1], minMaxValues);

            // In the case there is no intersection between symbols during the first recursion
            // The function returns null in this case
            if (aggFeature !== null) {
                aggFeatures.push(aggFeature);
            }
        }
    }

    let b = performance.now();
    console.log(b-a);

    // Features after aggregation
    // TODO notice about VGI features
    //console.log(aggFeatures);
    //console.log(parsedFeatures);
    let finalFeatures = aggFeatures.concat(splicedFeatures);




    /*for (let feature of parsedFeatures) {
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
    }*/

    // Removing features of multiple aggregation
    /*for (let feature of aggFeatures) {
        for (let otherFeature of aggFeatures) {
            if (feature.id_.includes(otherFeature.id_)) {
                aggFeatures.splice(aggFeatures.indexOf(otherFeature), 1);
            }
        }
    }*/

    // Copy features without intersection
    /*for (let feature of parsedFeatures) {
        if (!containsFeature(feature, aggFeatures)) {
            aggFeatures.push(feature);
        }
    }*/

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
    let polygonVgiFeatures = [];
    /*if (vgiFeatures.length > 0) {
        addTurfGeometry(vgiFeatures);
        //addVgiFeatures(vgiFeatures);
        addCrossreferences(vgiFeatures, aggFeatures);
        //find if there is some features for aggregating into the polygon
        polygonVgiFeatures = aggregateVgiToPolygon(vgiFeatures);
        //console.log(featureInfo);
    }*/

    // adding VGI features into aggregated features
    let VGIAndFeatures = aggFeatures.concat(vgiFeatures).concat(polygonVgiFeatures);

    function is_server() {
        return ! (typeof window != 'undefined' && window.document);
    }
    //console.log(is_server());
    //console.log(aggFeatures);

    return {
        features: finalFeatures,
        style: function (feature, resolution) {
            //TODO we don't need hash if we don't have caching
            //TODO try add caching on lower level of symbolization
            //let hash = Symbolizer.createHash(feature.id_, primary_property, value_idx);

            //if (cachedFeatureStyles.hasOwnProperty(hash)) {
            //    return cachedFeatureStyles[hash]
            //} else {
            if (feature.getId().startsWith('vgi_poly')) {
                return new PolygonSymbolizer(feature).createSymbol();
            } else if (feature.getId().startsWith('vgi')) {
                return new VGISymbolizer(feature, resolution).createSymbol();
            } else {
                let symbolizer = new Symbolizer(properties, feature, resolution, minMaxValues);
                return symbolizer.createSymbol();
            }
            //}
        }
    };
}