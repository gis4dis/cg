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
    addFeaturesToVgiIndex,
    getNewFeatures,
    recursiveAggregating,
    recursivePolygonAggregating,
    getPolygonFeatures,
    getConcatId,
    isServer,
} from './helpers';
import CombinedSymbol from './symbolizers/CombinedSymbol';
import PolygonSymbolizer from "./symbolizers/PolygonSymbolizer";

import PointRBush from './PointRBush';
import knn from 'rbush-knn';
import Polygon from "ol/geom/polygon";

let turfprojection = require('@turf/projection');
let turfhelper = require('@turf/helpers');
let turfconcave = require('@turf/concave');
let turfsmooth = require('@turf/polygon-smooth');

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

export const VGI_INDEX_DISTANCE = 1000;
export const INDEX_DISTANCE = 1500;

export let featureInfo = {};
export let splicedFeatures = [];
export let splicedVgiFeatures = [];

// Create RBush index for aggregating symbols
export const tree = new PointRBush(5);

// Create RBush index for VGI features - for aggregating into polygons
export const vgiTree = new PointRBush(5);

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

    let vgiFeatures = [];
    if (vgi_data !== undefined) {
        vgiFeatures = new GeoJSON().readFeatures(vgi_data, {
            dataProjection: 'EPSG:4326',
            featureProjection: 'EPSG:3857',
        });

        // Add prefix for VGI IDs
        for (let feature of vgiFeatures) {
            feature.setId(`vgi_${feature.getId()}`);
        }
    }

    let parsedFeatures = new GeoJSON().readFeatures(features, {
        dataProjection: 'EPSG:3857',
        featureProjection: 'EPSG:3857',
    });

    // Find new features. Features that are not inside the featureInfo. These features will be used for indexing
    //TODO pravdepodobne i vgi featury
    let newFeatures = getNewFeatures(parsedFeatures);
    let newVgiFeatures = getNewFeatures(vgiFeatures);

    // Adding features and VGI features into PointRBush index
    //TODO add VGI into tree index
    addFeaturesToIndex(newFeatures);
    //addFeaturesToIndex(newVgiFeatures);
    addFeaturesToVgiIndex(newVgiFeatures);

    // Adding geometry in WGS84 to OL feature because of computing using turf.js
    // Added to featureInfo variable
    addFeatureInfo(newFeatures);
    addFeatureInfo(newVgiFeatures);

    // Sorting properties - primary property is top left box
    let sortedProperties = sortProperties(properties, primary_property);

    // Min and max values for normalization
    let minMaxValues = getMinMaxValues(sortedProperties, parsedFeatures);

    // Copying array of station features and VGI features
    splicedFeatures = [...parsedFeatures];
    splicedVgiFeatures = [...vgiFeatures];

    // Creating combined symbols
    for (let feature of parsedFeatures) {
        featureInfo[feature.getId()].combinedSymbol = new CombinedSymbol(feature, sortedProperties, primary_property, resolution, value_idx, minMaxValues);
    }

    // Aggregating of the features
    let aggFeatures = [];
    let a = performance.now();

    //TODO pridat tady i VGI az je budu agregovat
    for (let feature of parsedFeatures) {
        let coordinates = feature.getGeometry().getCoordinates();

        // Find two features - one as query feature and the nearest feature to the query feature
        let indexedFeatures = knn(tree, coordinates[0], coordinates[1], 2, undefined, INDEX_DISTANCE);

        if (indexedFeatures[1] !== undefined) {
            let aggFeature = recursiveAggregating(indexedFeatures[0], indexedFeatures[1], minMaxValues);

            // In the case there is no intersection between symbols during the first recursion
            // The function returns null in this case
            if (aggFeature !== null) {
                aggFeatures.push(aggFeature);
            }
        }
    }

    console.log(aggFeatures);

    let b = performance.now();
    console.log(b-a);

    // Aggregating VGI features into polygons
    let aggVgiFeatures = [];

    for (let feature of vgiFeatures) {
        let coordinates = feature.getGeometry().getCoordinates();

        // Find two features - one as query feature and the nearest feature to the query feature
        // TODO think about using buffers for VGI features
        // TODO aggregate only same vgi features or change style for that features
        let indexedFeatures = knn(vgiTree, coordinates[0], coordinates[1], 2, undefined, VGI_INDEX_DISTANCE);

        if (indexedFeatures[1] !== undefined) {
            let vgiPolygonFeatures = [];
            vgiPolygonFeatures.push(featureInfo[indexedFeatures[0].id].olFeature);
            vgiPolygonFeatures = recursivePolygonAggregating(indexedFeatures[0], indexedFeatures[1], vgiPolygonFeatures);

            // Create polygon only if there are more 3 features at least
            if (vgiPolygonFeatures.length >= 3) {

                // Creating new polygon OL feature
                let polygonFeature = new Feature({
                    intersectedFeatures: vgiPolygonFeatures,
                    geometry: new Polygon(turfsmooth.default(turfconcave.default(turfhelper.featureCollection(
                        Array.from(vgiPolygonFeatures, f => featureInfo[f.getId()].turfGeometry))), {iterations: 3}).features[0].geometry.coordinates)
                });

                let concatId = getConcatId(vgiPolygonFeatures);
                polygonFeature.setId(`vgi_poly_${concatId}`);

                let wgs84Coordinates = polygonFeature.getGeometry().getCoordinates();
                polygonFeature.getGeometry().transform('EPSG:4326', 'EPSG:3857');

                // Add feature into featureInfo
                featureInfo[polygonFeature.getId()] = {
                    'id': polygonFeature.getId(),
                    'olFeature': polygonFeature,
                    'coordinates': polygonFeature.getGeometry().getCoordinates(),
                    'wgs84': wgs84Coordinates,
                    'turfGeometry': turfhelper.point(wgs84Coordinates),
                    'combinedSymbol': null
                };

                aggVgiFeatures.push(polygonFeature);
            } else {
                // if there are 2 and less features. Only add not aggregated features
                aggVgiFeatures.concat(vgiPolygonFeatures);
            }
        }
    }

    addCrossreferences(vgiFeatures, aggFeatures);
    //console.log(vgiFeatures);
    //console.log(aggVgiFeatures);


    let finalFeatures = aggFeatures.concat(splicedFeatures).concat(aggVgiFeatures).concat(splicedVgiFeatures);



    return {
        features: finalFeatures,
        style: function (feature, resolution) {
            if (feature.getId().startsWith('vgi_poly')) {
                return new PolygonSymbolizer(feature).createSymbol();
            } else if (feature.getId().startsWith('vgi')) {
                return new VGISymbolizer(feature, resolution).createSymbol();
            } else {
                let symbolizer = new Symbolizer(properties, feature, resolution, minMaxValues);
                return symbolizer.createSymbol();
            }
        }
    };
}