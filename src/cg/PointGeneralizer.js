import concave from '@turf/concave';

/** Represents Generalizer for point features. */
export default class Symbolizer {

    constructor(featureCollection, resolution, property) {
        this.featureCollection = featureCollection;
        this.resolution = resolution;
        this.property = property;
    }

    generalizeFeatures() {
        //TODO add maxEdge value to concave
        let concaveHull = concave(this.featureCollection, {units: 'kilometres'});
        console.log(concaveHull);
        return concaveHull;
    }

    getFeatures() {
        return this.featureCollection;
    }
}