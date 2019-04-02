import {featureInfo} from "./generalize";

let turfhelper = require('@turf/helpers');
let turfbuffer = require('@turf/buffer');
let turfintersect = require('@turf/intersect');
let turfprojection = require('@turf/projection');

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

/**
 * Finds intersection between two features.
 * turfintersect returns null if features are not intersecting
 * @param {Feature} feature1 - first feature
 * @param {Feature} feature2 - second feature
 * @returns {*} return null if the feature are identical (have same ID) or true if features are intersecting
 */
export function findIntersection(feature1, feature2) {
    if (feature1.id_ === feature2.id_) {
        return null;
    }
    let intersection = turfintersect.default(featureInfo[feature1.getId()].combinedSymbol.buffer, featureInfo[feature2.getId()].combinedSymbol.buffer);
    return intersection !== null;
}

/**
 * Adds turfgeometry object inside the featureInfo structure for every feature in array
 * @param {Feature[]} features - array of features
 * @returns {featureInfo} returns featureInfo object
 */
export function addTurfGeometry(features) {
    for (let feature of features) {
        featureInfo[feature.getId()] = {
            'wgs84': turfprojection.toWgs84(feature.getGeometry().getCoordinates()),
            'turfGeometry': turfhelper.point(turfprojection.toWgs84(feature.getGeometry().getCoordinates())),
            'combinedSymbol': null
        };
    }

    return featureInfo;
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
 * @param {number[]} coord - coordinations of first feature
 * @param {number[]} other - coordinations of second feature
 * @returns {number[]} position of the new centroid
 */
export function getNewCentroid(coord, other) {
    return [(coord[0] + other[0]) / 2, (coord[1] + other[1]) / 2];
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