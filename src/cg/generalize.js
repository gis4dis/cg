import GeoJSON from 'ol/format/geojson';
import Symbolizer from './symbolizers/Symbolizer';
import Feature from 'ol/feature';
import Polygon from 'ol/geom/polygon';
import Style from 'ol/style/style';
import Stroke from 'ol/style/stroke';
import Fill from 'ol/style/fill';
import PolygonSymbolizer from './symbolizers/PolygonSymbolizer';
let turfhelper = require('@turf/helpers');
let turfbuffer = require('@turf/buffer');
let turfintersect = require('@turf/intersect');
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

    function computeBuffer(feature) {
        let scaleValues = [];

        for (let i in feature.values_.featureStyle) {
            scaleValues.push(parseFloat(feature.values_.featureStyle[i].image_.scale_));
        }

        let scaleMaxValue = Math.max(...scaleValues);
        let radius = ((70 * scaleMaxValue) * Math.sqrt(2)) * resolution;
        return turfbuffer.default(feature.values_.turfGeometry, radius, {units: 'meters'});
    }

    function findIntersection(feature1, feature2) {
        //console.log(feature1.values_.buffer);
        //console.log(feature2.values_.buffer);

        if (feature1.id_ === feature2.id_) {return null;}
        let intersection = turfintersect.default(feature1.values_.buffer, feature2.values_.buffer);
        return intersection !== null;
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

    // Sorting properties - primary property is top left box
    let sortedProperties = Symbolizer.sortProperties(properties, primary_property);


    //TODO 1. make group symbols
    // 3. compute a buffer

    // Adding geometry in WGS84 to OL feature because of computing using turf.js
    for (let i in parsedFeatures) {
            parsedFeatures[i].setProperties({'wgs84': turfprojection.toWgs84(parsedFeatures[i].getGeometry().getCoordinates())});
            parsedFeatures[i].setProperties({'turfGeometry': turfhelper.point(turfprojection.toWgs84(parsedFeatures[i].getGeometry().getCoordinates()))});
    }

    console.log(parsedFeatures);

    // Min and max values for normalization
    let minMaxValues = {};

    sortedProperties.forEach(function(property) {
        minMaxValues[property.name_id] = {};
        minMaxValues[property.name_id]['min'] = Symbolizer.getMinValue(parsedFeatures, property.name_id);
        minMaxValues[property.name_id]['max'] = Symbolizer.getMaxValue(parsedFeatures, property.name_id);
    });

    // Caching the styles
    if (Object.keys(cachedFeatureStyles).length === 0) {
        let length = 0;
        parsedFeatures.forEach(function(feature) {

            sortedProperties.forEach(function(property) {
                if (feature.values_.hasOwnProperty(property.name_id)) {
                    length = feature.values_[property.name_id].values.length;
                }
            });

            for (let i = 0; i < length; i++) {
                let symbolizer = new Symbolizer(primary_property, sortedProperties, feature, i, resolution, minMaxValues);
                let featureStyle = symbolizer.createSymbol();

                // adding style to a feature
                feature.setProperties({'featureStyle': featureStyle});
                feature.setProperties({'buffer': computeBuffer(feature)});

                //console.log('Feature');
                //console.log(feature);

                let hash = Symbolizer.createHash(feature.id_, primary_property, i);

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
    }

    let intersectedFeatures = [];
    // Finding intersected features
    for (let k in parsedFeatures) {
        intersectedFeatures = [];
        for (let l in parsedFeatures) {
            if (findIntersection(parsedFeatures[k], parsedFeatures[l])) {
                intersectedFeatures.push(parsedFeatures[l]);
            }
        }
        parsedFeatures[k].setProperties({'intersectedFeatures': intersectedFeatures});
    }
    console.log(intersectedFeatures);


    //test of feature buffers
    console.log(parsedFeatures);

    let bufferFeatures = [];
    for (let i in parsedFeatures) {
        let featureTest = new Feature({
            name: "Test",
            geometry: new Polygon(parsedFeatures[i].values_.buffer.geometry.coordinates).transform('EPSG:4326', 'EPSG:3857')
        });
        let myStroke = new Stroke({
            color : 'rgba(255,0,0,1.0)',
            width : 2
        });
        featureTest.setStyle(new Style({stroke: myStroke}));
        bufferFeatures.push(featureTest);
    }

    console.log('Buffer features');
    console.log(bufferFeatures);
    let testFeatures = parsedFeatures.push(bufferFeatures[0]);

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