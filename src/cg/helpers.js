import {
    featureInfo,
    tree,
    vgiTree,
    splicedFeatures,
    splicedVgiFeatures,
    resolution} from "./generalize";
import Feature from "ol/feature";
import Point from "ol/geom/point";
import Polygon from "ol/geom/polygon";
import knn from "rbush-knn";

const DISTANCE_POLYGON = 0.5;

let turfhelper = require('@turf/helpers');
let turfintersect = require('@turf/intersect');
let turfprojection = require('@turf/projection');


/*export function aggregateVgiToPolygon(features) {
    let aggregatedFeatures = [];
    for (let f1 of features) {
        for (let f2 of features) {
            if (f1.getId() !== f2.getId()) {
                if (turfdistance.default(featureInfo[f1.getId()].turfGeometry, featureInfo[f2.getId()].turfGeometry, {units: 'kilometers'}) < DISTANCE_POLYGON) {
                    if (!containsFeature(f1, aggregatedFeatures)) {
                        aggregatedFeatures.push(f1);
                    }
                }
            }
        }
    }
    //TODO count with more polygons from VGI and added only for the same phenomenons, check if there is any feature inside aggregatedFeatures
    let polygonFeature = turfsmooth.default(turfconcave.default(turfhelper.featureCollection(
        Array.from(aggregatedFeatures, f => featureInfo[f.getId()].turfGeometry))), {iterations: 3}).features[0];

    //console.log(polygonFeature);
    let feature = new Feature({
        intersectedFeatures: aggregatedFeatures,
        geometry: new Polygon(polygonFeature.geometry.coordinates)
    });
    feature.getGeometry().transform('EPSG:4326', 'EPSG:3857');
    //TODO update polygon id
    feature.setId(`vgi_poly_1`);

    featureInfo[feature.getId()] = {
        'combinedSymbol': null,
        'turfGeometry': null,
        'wgs84': null
    };
    //console.log(feature);
    //console.log(featureInfo);
    //updateTurfGeometry(feature);

    return feature;
}*/

export function getConcatId(features) {
    let id = '';

    for (let feature of features) {
        id = id + feature.getId();
    }

    return id;
}

/**
 * Checks if feature is inside the array
 * @param {Feature} feature - OpenLayer feature
 * @param {Feature[]} array - array of OpenLayer features
 * @returns {boolean} true if feature is inside the array
 */
export function containsFeature(feature, array) {
    for (let otherFeature of array) {
        if (otherFeature.id_ === feature.id_) {
            return true;
        }
    }

    return false;
}

export function isServer() {
    return ! (typeof window != 'undefined' && window.document);
}

export function recursivePolygonAggregating(indexedFeature, vgiPolygonFeatures, VGI_INDEX_DISTANCE) {
    // Get info about feature from featureInfo
    let nearestFeature = featureInfo[indexedFeature.id];

    // Remove features from RBush Index
    vgiTree.remove(indexedFeature, (a, b) => {
        return a.id === b.id;
    });

    vgiPolygonFeatures.push(nearestFeature.olFeature);

    // Remove features from original featureCollection - these features was aggregated
    let index1 = splicedVgiFeatures.findIndex(f => f.id_ === indexedFeature.id);

    /*console.log('odstranuju helper');
    console.log(indexedFeature.id);
    if (index1 !== -1) {
        splicedVgiFeatures.splice(index1, 1);
    }*/

    // Find another nearest feature - if there is another one
    let indexedFeatures = knn(vgiTree, indexedFeature.x, indexedFeature.y, 1, undefined, VGI_INDEX_DISTANCE);

    if (indexedFeatures[0] !== undefined) {
        return recursivePolygonAggregating(indexedFeatures[0], vgiPolygonFeatures, VGI_INDEX_DISTANCE);
    }
    return vgiPolygonFeatures;
}

export function recursiveAggregating(queryFeature, indexedFeature, minMaxValues, INDEX_DISTANCE) {
    // Get info about feature from featureInfo
    let featureI = featureInfo[queryFeature.id];
    let nearestFeature = featureInfo[indexedFeature.id];

    if (findIntersection(featureI, nearestFeature)) {

        // Compute coordinates of new aggregated Feature
        let newCoords = getNewCentroid(featureI.coordinates, nearestFeature.coordinates);

        // Creating new OL feature
        let aggFeature = new Feature({
            intersectedFeatures: [],
            geometry: new Point(newCoords)
        });

        // Set new ID of feature
        aggFeature.setId(`agg_${featureI.id}:${nearestFeature.id}`);

        // Add features into new aggregated Features
        if ('intersectedFeatures' in featureI.olFeature.values_) {
            aggFeature.values_.intersectedFeatures = aggFeature.values_.intersectedFeatures.concat(featureI.olFeature.values_.intersectedFeatures);
            aggFeature.values_.intersectedFeatures.push(nearestFeature.olFeature);
        } else {
            aggFeature.values_.intersectedFeatures.push(featureI.olFeature);
            aggFeature.values_.intersectedFeatures.push(nearestFeature.olFeature);
        }

        // Add feature into featureInfo
        featureInfo[aggFeature.getId()] = {
            'id': aggFeature.getId(),
            'olFeature': aggFeature,
            'coordinates': newCoords,
            'wgs84': turfprojection.toWgs84(newCoords),
            'turfGeometry': turfhelper.point(turfprojection.toWgs84(newCoords)),
            'combinedSymbol': null
        };

        // Set new combinedSymbol
        featureInfo[aggFeature.getId()].combinedSymbol = featureI.combinedSymbol;
        featureInfo[aggFeature.getId()].combinedSymbol.aggregateSymbols(nearestFeature.combinedSymbol);

        // Update buffer for combinedSymbol of new Feature
        featureInfo[aggFeature.getId()].combinedSymbol.setBuffer(aggFeature, minMaxValues);

        // Remove features from RBush Index
        tree.remove(queryFeature, (a, b) => {
            return a.id === b.id;
        });
        tree.remove(indexedFeature, (a, b) => {
            return a.id === b.id;
        });


        delete featureInfo[indexedFeature.id];

        // Add new aggregated feature into RBush index
        tree.insert({
            id: aggFeature.getId(),
            x: newCoords[0],
            y: newCoords[1]
        });

        // Remove features from original featureCollection - these features was aggregated
        let index1 = splicedFeatures.findIndex(f => f.id_ === indexedFeature.id);
        let index2 = splicedFeatures.findIndex(f => f.id_ === queryFeature.id);

        if (index1 !== -1) {
            splicedFeatures.splice(index1, 1);
        }

        if (index2 !== -1) {
            splicedFeatures.splice(index2, 1);
        }

        delete featureInfo[queryFeature.id];

        // Find another nearest feature - if there is another one
        let indexedFeatures = knn(tree, newCoords[0], newCoords[1], 2, undefined, INDEX_DISTANCE);

        if (indexedFeatures[1] !== undefined) {
            if (!(findIntersection(featureInfo[indexedFeatures[0].id], featureInfo[indexedFeatures[1].id]))) {
                return aggFeature;
            }
            return recursiveAggregating(indexedFeatures[0], indexedFeatures[1], minMaxValues, INDEX_DISTANCE);
        }
        return aggFeature;
    }
    return null
}

/**
 * Finds intersection between two features.
 * turf.intersect returns null when features are not intersecting
 * @param {Feature} f1 - first feature
 * @param {Feature} f2 - second feature
 * @returns {*} returns null when features are the same (ID) or true when features collide
 */
export function findIntersection(f1, f2) {
    if (f1 === undefined || f2 === undefined) {
        return false;
    }
    if (f1.id === f2.id) {
        return null;
    }
    let intersection = turfintersect.default(f1.combinedSymbol.buffer, f2.combinedSymbol.buffer);
    return intersection !== null;
}

/**
 * Adds feature info object inside the featureInfo structure for every feature in array
 * @param {Feature[]} features - array of features
 */
export function addFeatureInfo(features) {
    for (let feature of features) {
        if (featureInfo[feature.getId()] === undefined) {
            featureInfo[feature.getId()] = {
                'id': feature.getId(),
                'olFeature': feature,
                'coordinates': feature.getGeometry().getCoordinates(),
                'wgs84': turfprojection.toWgs84(feature.getGeometry().getCoordinates()),
                'turfGeometry': turfhelper.point(turfprojection.toWgs84(feature.getGeometry().getCoordinates())),
                'combinedSymbol': null
            };
        }
    }
}

export function getPolygonFeatures(features) {
    let feats = [];
    for (let feature of features) {
        feats.push(feature.olFeature);
    }
    return feats;
}

export function getNewFeatures(features) {
    let newFeatures = [];

    for (let feature of features) {
        if (featureInfo[feature.getId()] === undefined) {
            newFeatures.push(feature);
        }
    }

    return newFeatures;
}

export function addFeatureToIndex(feature) {
    let coordinates = feature.getGeometry().getCoordinates();
    tree.insert({
        id: feature.getId(),
        x: coordinates[0],
        y: coordinates[1]
    });
}

export function addFeaturesToVgiIndex(features) {
    for (let feature of features) {
        let coordinates = feature.getGeometry().getCoordinates();
        vgiTree.insert({
            id: feature.getId(),
            x: coordinates[0],
            y: coordinates[1]
        });
    }
}

export function addFeaturesToIndex(features) {
    for (let feature of features) {
        let coordinates = feature.getGeometry().getCoordinates();
        tree.insert({
            id: feature.getId(),
            x: coordinates[0],
            y: coordinates[1]
        });
    }
}

export function addVgiFeatures(features) {
    for (let feature of features) {
        featureInfo[feature.getId()]['vgiFeature'] = feature;
    }
}

/**
 * Sorts properties based on primary property
 * @param {Object} properties - object of properties
 * @param {String} primary_property - value selected by user
 *  (https://github.com/gis4dis/mc-client/blob/e7e4654dbd4f4b3fb468d4b4a21cadcb1fbbc0cf/static/data/properties.json)
 * @returns {Object} - sorted properties with position symbol parameter
 */
export function sortProperties(properties, primary_property) {
    let positions = ['PRIMARY', 'SECONDARY', 'TERTIARY', 'OTHER'];

    let positionsCounter = 1;
    for (let i in properties) {
        if (properties[i].name_id === primary_property) {
            properties[i].position = positions[0];
        } else {
            properties[i].position = positions[positionsCounter];
            positionsCounter += 1;
        }
    }

    return properties;
}

/**
 * Updates turf geometry for feature
 * @param {Feature} feature - OpenLayer feature
 */
export function updateTurfGeometry(feature) {
    featureInfo[feature.getId()].wgs84 = turfprojection.toWgs84(feature.getGeometry().getCoordinates());
    featureInfo[feature.getId()].turfGeometry = turfhelper.point(turfprojection.toWgs84(feature.getGeometry().getCoordinates()));
}

/**
 * Returns position of the new centroid
 * @param {number[]} coords - coordinations of first feature
 * @param {number[]} other - coordinations of second feature
 * @returns {number[]} position of the new centroid
 */
export function getNewCentroid(coords, other) {
    return [(coords[0] + other[0]) / 2, (coords[1] + other[1]) / 2];
}

/**
 * Returning max value from geojson array with specific key
 * @param {ol.Feature} features - array of OL features
 * @param {String} name_id - name_id of property
 * @returns {number} - Max value from array
 */
function getMaxValue(features, name_id) {
    let maxValue = null;

    for (let feature of features) {
        if (feature.values_.hasOwnProperty(name_id)) {
            if (maxValue === null || maxValue < Math.max(...feature.values_[name_id]['values'])) {
                maxValue = Math.max(...feature.values_[name_id]['values']);
            }
        }
    }

    return maxValue;
}

/**
 * Returning min value from geojson array with specific key
 * @param {Feature} features - array of OL features
 * @param {String} name_id - name_id of property
 * @returns {number} - Min value from array
 */
function getMinValue(features, name_id) {
    let minValue = null;

    for (let feature of features) {
        if (feature.values_.hasOwnProperty(name_id)) {
            if (minValue === null || minValue > Math.min(...feature.values_[name_id]['values'])) {
                minValue = Math.min(...feature.values_[name_id]['values']);
            }
        }
    }

    return minValue;
}

/**
 * Return object of minimum and maximum values for all properties
 * @param {Object[]} properties - list of property objects
 * @param {Feature[]} features - list of OpenLayer features
 * @returns {Object[]} - object of minimum and maximum values
 */
export function getMinMaxValues(properties, features) {
    let minMaxValues = {};

    for (let property of properties) {
        minMaxValues[property.name_id] = {};
        minMaxValues[property.name_id]['min'] = getMinValue(features, property.name_id);
        minMaxValues[property.name_id]['max'] = getMaxValue(features, property.name_id);
    }

    return minMaxValues;
}
