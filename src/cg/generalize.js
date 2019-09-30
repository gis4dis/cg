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

let turfhelper = require('@turf/helpers');
let turfconcave = require('@turf/concave');
let turfsmooth = require('@turf/polygon-smooth');
//let turfinterpolate = require('@turf/interpolate');

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

export let featureInfo = {};
export let splicedFeatures = [];
export let splicedVgiFeatures = [];

// Create RBush index for aggregating symbols
export const tree = new PointRBush(5);

// Create RBush index for VGI features - for aggregating into polygons
export const vgiTree = new PointRBush(5);

export default ({topic, primary_property, properties, features, vgi_data, value_idx, resolution}) => {
    const VGI_INDEX_DISTANCE = 50 * Math.trunc(resolution); //1000
    const INDEX_DISTANCE = 85 * Math.trunc(resolution); //1500
    const CROSSREFERENCE_DISTANCE = 50 * Math.trunc(resolution); //1000

    //let a = performance.now();

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
    tree.clear();
    addFeaturesToIndex(parsedFeatures);
    //addFeaturesToIndex(newVgiFeatures);
    vgiTree.clear();
    addFeaturesToVgiIndex(vgiFeatures);

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


    //TODO pridat tady i VGI az je budu agregovat
    for (let feature of parsedFeatures) {
        let coordinates = feature.getGeometry().getCoordinates();

        if (featureInfo[feature.getId()] === undefined) {
            continue;
        }

        // Find two features - one as query feature and the nearest feature to the query feature
        let indexedFeatures = knn(tree, coordinates[0], coordinates[1], 2, undefined, INDEX_DISTANCE);

        if (indexedFeatures[1] !== undefined) {
            let aggFeature = recursiveAggregating(indexedFeatures[0], indexedFeatures[1], minMaxValues, INDEX_DISTANCE);

            // In the case there is no intersection between symbols during the first recursion
            // The function returns null in this case
            if (aggFeature !== null) {
                aggFeatures.push(aggFeature);
            }
        }
    }

    //console.log(aggFeatures);

    // Crossreferences
    for (let feature of vgiFeatures) {
        let coordinates = feature.getGeometry().getCoordinates();

        // Find two features - one as query feature and the nearest feature to the query feature
        let indexedFeatures = knn(vgiTree, coordinates[0], coordinates[1], 3, undefined, CROSSREFERENCE_DISTANCE);

        // if there are more than one close VGI feature
        if (indexedFeatures[2] !== undefined) {
            featureInfo[feature.getId()]['crossReference'] = 'more';
        } else if (indexedFeatures[1] !== undefined) {
            // if there is only one VGI feature in maxDistance
            featureInfo[feature.getId()]['crossReference'] = 'one';
        }
    }

    // Aggregating VGI features into polygons
    let aggVgiFeatures = [];
    //TODO don't forget uncomment this
/*
    for (let feature of vgiFeatures) {
        let coordinates = feature.getGeometry().getCoordinates();

        // Find two features - one as query feature and the nearest feature to the query feature
        // TODO think about using buffers for VGI features
        // TODO aggregate only same vgi features or change style for that features
        let indexedFeatures = knn(vgiTree, coordinates[0], coordinates[1], 2, undefined, VGI_INDEX_DISTANCE);

        if (indexedFeatures[1] !== undefined) {
            let vgiPolygonFeatures = [];
            vgiPolygonFeatures.push(featureInfo[indexedFeatures[0].id].olFeature);
            vgiPolygonFeatures = recursivePolygonAggregating(indexedFeatures[0], indexedFeatures[1], vgiPolygonFeatures, VGI_INDEX_DISTANCE);

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
*/
    //console.log(vgiFeatures);
    //console.log(aggVgiFeatures);

    // Aggregate VGI into weather stations (aggregated or not)
    //TODO add recursive aggregation
    for (let feature of splicedFeatures) {
        //console.log(feature);
        let coordinates = feature.getGeometry().getCoordinates();
        let indexedFeatures = knn(vgiTree, coordinates[0], coordinates[1], 1, undefined, VGI_INDEX_DISTANCE);

        //console.log(indexedFeatures);
        if (indexedFeatures[0] !== undefined) {
            let combinedSymbol = featureInfo[feature.getId()].combinedSymbol;
            combinedSymbol.addVgiToOtherSymbols(featureInfo[indexedFeatures[0].id].olFeature);
            featureInfo[feature.getId()].combinedSymbol = combinedSymbol;

            vgiTree.remove(indexedFeatures[0], (a, b) => {
                return a.id === b.id;
            });
        }
    }

    for (let feature of aggFeatures) {
        //console.log(feature);
        let coordinates = feature.getGeometry().getCoordinates();
        let indexedFeatures = knn(vgiTree, coordinates[0], coordinates[1], 1, undefined, VGI_INDEX_DISTANCE);

        //console.log(indexedFeatures);
        if (indexedFeatures[0] !== undefined) {
            let combinedSymbol = featureInfo[feature.getId()].combinedSymbol;
            combinedSymbol.addVgiToOtherSymbols(featureInfo[indexedFeatures[0].id].olFeature);
            featureInfo[feature.getId()].combinedSymbol = combinedSymbol;

            vgiTree.remove(indexedFeatures[0], (a, b) => {
                return a.id === b.id;
            });
        }
    }
    /*
    // Interpolate primary property into polygons
    //TODO change installation of turf and turf imports
    let points = [];

    for (let feature of parsedFeatures) {
        let f = featureInfo[feature.getId()];
        let point = f.turfGeometry;

        point.properties.primaryPropertyValue = f.combinedSymbol.primarySymbol.value;
        points.push(point);
    }

    let pointCollection = turfhelper.featureCollection(points);
    //let points = turfrandom.randomPoint(30, {bbox: [50, 30, 70, 50]});

    //console.log(points);
    let options = {gridType: 'square', property: 'primaryPropertyValue', units: 'kilometers'};
    let grid = turfinterpolate.default(pointCollection, 0.1, options);

    let counter = 0;
    turfmeta.featureEach(grid, function(square) {
        square.id = 'grid_poly' + counter;
        counter += 1;
    });
    //console.log(grid);

    let gridFeatures = new GeoJSON().readFeatures(grid, {
        dataProjection: 'EPSG:4326',
        featureProjection: 'EPSG:3857',
    });*/


    //let pointCollection = turfhelper.featureCollection([turfhelper.point([-75.343, 39.984], {name: 'Location A'}), turfhelper.point([-75.343, 39.984], {name: 'Location A'}), turfhelper.point([-75.343, 39.984], {name: 'Location A'})]);

    //let options = {gridType: 'square', property: 'primaryPropertyValues', units: 'kilometers'};
    //console.log(pointCollection);
    //let grid = turfinterpolate.default((pointCollection, 100, options));
    //console.log(grid);


    //console.log(featureInfo);

    /*for (let feature of splicedFeatures) {
        console.log('');

    }*/
    //console.log(aggFeatures);


    let finalFeatures = aggFeatures.concat(splicedFeatures).concat(aggVgiFeatures).concat(splicedVgiFeatures);//.concat(gridFeatures);

    //let b = performance.now();

    return {
        features: finalFeatures,
        style: function (feature, resolution) {
            if (feature.getId().startsWith('vgi_poly')) {
                return new PolygonSymbolizer(feature).createSymbol();
            } else if (feature.getId().startsWith('vgi')) {
                return new VGISymbolizer(feature, resolution, [0.5, 0.5]).createSymbol();
            } else if (feature.getId().startsWith('grid_poly')) {
                return new PolygonSymbolizer(feature).createDefaultSymbol();
            } else {
                let symbolizer = new Symbolizer(properties, feature, resolution, minMaxValues);
                return symbolizer.createSymbol();
            }
        }
    };
}
