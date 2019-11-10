import {featureInfo} from "../generalize";
let turfhelper = require('@turf/helpers');
import isolines from '@turf/isolines';
import interpolate from '@turf/interpolate';
import jenks from 'turf-jenks';



/** Represents Isolines creator */
export default class Isolines {
    /**
     * Instantiating of Combined symbol object - object contains 4 parts of combined symbol - left-top, left-bottom,
     * right-top, right-bottom.
     * @constructor
     * @param {String} anomalyOrNot - all features, anomaly features or not anomaly features
     */
    constructor(anomalyOrNot, noBreaks) {
        this.anomalyOrNot = anomalyOrNot;
        this.fCollection = this.prepareFeatures();
        this.breaks = jenks(this.fCollection, 'value', noBreaks);
        console.log(this.breaks);
        console.log(this.fCollection);
    }

    prepareFeatures() {
        let features = [];
        let keys = Object.keys(featureInfo);

        for (let key of keys) {
            if (featureInfo[key].combinedSymbol !== null) {
                if (featureInfo[key].combinedSymbol.primarySymbol.nameId !== null) {
                    let turfPoint = turfhelper.point(featureInfo[key].wgs84, {
                        id: featureInfo[key].id,
                        value: featureInfo[key].combinedSymbol.primarySymbol.value
                    });
                    features.push(turfPoint);
                }
            }
        }

        return turfhelper.featureCollection(features);
    }

    getPointGrid() {
        return interpolate(this.fCollection, 1, {gridType: 'points', property: 'value', units: 'kilometers'});
    }

    createIsolines() {
        let lines = isolines(this.getPointGrid(), this.breaks, {zProperty: 'value'});
        console.log(lines);
        return lines;
    }
}
