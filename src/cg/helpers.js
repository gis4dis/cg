import Symbolizer from "./symbolizers/Symbolizer";

let turfhelper = require('@turf/helpers');
let turfbuffer = require('@turf/buffer');
let turfintersect = require('@turf/intersect');
let turfprojection = require('@turf/projection');


export function findIntersection(feature1, feature2) {
    console.log('BUFFER INTERSECTION');
    console.log(feature1);
    console.log(feature2);

    if (feature1.id_ === feature2.id_) {return null;}
    let intersection = turfintersect.default(feature1.values_.combinedSymbol.buffer, feature2.values_.combinedSymbol.buffer);
    return intersection !== null;
}

export function addTurfGeometry(features) {
    for (let feature of features) {
        feature.setProperties({'wgs84': turfprojection.toWgs84(feature.getGeometry().getCoordinates())});
        feature.setProperties({'turfGeometry': turfhelper.point(turfprojection.toWgs84(feature.getGeometry().getCoordinates()))});
    }

    return features;
}

export function updateTurfGeometry(feature) {
    feature.setProperties({'wgs84': turfprojection.toWgs84(feature.getGeometry().getCoordinates())});
    feature.setProperties({'turfGeometry': turfhelper.point(turfprojection.toWgs84(feature.getGeometry().getCoordinates()))});
}

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
 * @param {ol.Feature} features - array of OL features
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

export function getMinMaxValues(properties, features) {
    let minMaxValues = {};

    for (let property of properties) {
        minMaxValues[property.name_id] = {};
        minMaxValues[property.name_id]['min'] = getMinValue(features, property.name_id);
        minMaxValues[property.name_id]['max'] = getMaxValue(features, property.name_id);
    }

    return minMaxValues;
}