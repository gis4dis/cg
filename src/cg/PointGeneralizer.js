import concave from '@turf/concave';
import distance from '@turf/distance';
import proj4 from 'proj4';


const proj3857 = proj4('EPSG:3857');
const proj4326 = proj4('EPSG:4326');
/** Represents Generalizer for point features. */
export default class Symbolizer {

    constructor(featureCollection, resolution, property) {
        this.featureCollection = featureCollection;
        this.features = featureCollection.features;
        this.resolution = resolution;
        this.property = property;
    }

    static transformPointTo4326(point) {
        return proj4(proj3857, proj4326, point.geometry.coordinates)
    }

    generalizeFeatures() {
        //TODO add maxEdge value to concave
        let concaveHull = concave(this.featureCollection, {units: 'kilometres'});
        console.log(concaveHull);
        return concaveHull;
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

    getFeatures() {
        return this.featureCollection;
    }
}