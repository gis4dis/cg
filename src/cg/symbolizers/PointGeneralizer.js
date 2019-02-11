import concave from '@turf/concave';
import distance from '@turf/distance';
import proj4 from 'proj4';
import Symbolizer from './Symbolizer';
let turfbuffer = require('@turf/buffer');


const proj3857 = proj4('EPSG:3857');
const proj4326 = proj4('EPSG:4326');

/** Represents Generalizer for point features. */
export default class PointGeneralizer {

    constructor(features, resolution, properties, valueIdx, minMaxValues, primaryProperty) {
        this.features = features;
        this.resolution = resolution;
        this.properties = properties;
        this.valueIdx = valueIdx;
        this.minMaxValues = minMaxValues;
        this.primaryProperty = primaryProperty;
    }

    static transformPointTo4326(point) {
        return proj4(proj3857, proj4326, point.geometry.coordinates)
    }

    computeBuffers() {
        let buffers = {};

        //TODO make this simpler OMG
        this.features.forEach(function(feature, index) {
            this.properties.forEach(function(property) {
                if (feature.values_.hasOwnProperty(property.name_id)) {
                    let length = feature.values_[property.name_id].values.length;
                    for (let i = 0; i < length; i++) {
                        let scaleValues = [];
                        this.properties.forEach(function(property) {
                            if (feature.values_.hasOwnProperty(property.name_id)) {
                                let scaleValue = Symbolizer.normalize(feature.values_[property.name_id].values[i],
                                    this.minMaxValues[property.name_id]['min'], this.minMaxValues[property.name_id]['max']);
                                scaleValues.push(scaleValue);
                            }
                        }.bind(this));

                        let scaleMaxValue = Math.max(...scaleValues);
                        let radius = ((70 * scaleMaxValue) * Math.sqrt(2)) * this.resolution;
                        let hash = Symbolizer.createHash(feature.id_, this.primaryProperty, i);
                        buffers[hash] = turfbuffer.default(feature.values_.turfGeometry, radius, {units: 'meters'});

                    }
                }

            }.bind(this));




            //console.log('FEATURE VALUE');
            //console.log(feature.values_[property.name_id].values[this.valueIdx]);

            //console.log('SCALE VALUE');
            //console.log(scaleValue);

        }.bind(this));
        return buffers;
    }


    //TODO rename method
    generalizeFeatures() {
        //TODO add maxEdge value to concave
        let concaveHull = concave(this.featureCollection, {units: 'kilometres'});
        //console.log(concaveHull);
        return concaveHull;
    }

    meanDistance() {
        let numberOfPoints = this.features.length;
        let cumulativeDistance;

        for (let i in this.features) {
            for (let j in this.features) {
                cumulativeDistance = distance(Symbolizer.transformPointTo4326(this.features[i]), Symbolizer.transformPointTo4326(this.features[j]))
            }
        }

        return cumulativeDistance/numberOfPoints;
    }

    maxDistance() {
        let maxPointDistance = distance(Symbolizer.transformPointTo4326(this.features[0]),
            Symbolizer.transformPointTo4326(this.features[1]));

        for (let i in this.features) {
            for (let j in this.features) {
                maxPointDistance = Math.max(distance(Symbolizer.transformPointTo4326(this.features[i]), Symbolizer.transformPointTo4326(this.features[j])), maxPointDistance);
            }
        }
        return maxPointDistance;
    }
}