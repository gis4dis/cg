import Style from 'ol/style/style';
import Icon from 'ol/style/icon';
import Fill from 'ol/style/fill';
import Symbolizer from './Symbolizer';


/** Represents Symbolizer for features. Contains set of operations including creating styles */
export default class CachedSymbolizer extends Symbolizer {

    /**
     * Instantiating of Symbolizer object
     * @constructor
     * @param {Object.<string, string>} property - values selected by user
     *  (https://github.com/gis4dis/mc-client/blob/e7e4654dbd4f4b3fb468d4b4a21cadcb1fbbc0cf/static/data/properties.json)
     * @param {Object.GeoJSON} feature - represented as one feature from an Array of GeoJSON Features, each of them includes attributes
     *  (https://github.com/gis4dis/cg/blob/master/data/example.json)
     * @param {number} valueIdx - an index of value that should be used for generalization
     * @param {number} resolution - number, represents projection units per pixel (the projection is EPSG:3857)
     * @param {number} maxPropertyValue - max value from property values
     * @param {number} minPropertyValue - min value from property values
     * @param {number} maxAnomalyValue - max value from property anomaly rates
     * @param {number} minAnomalyValue - min value from property anomaly rates
     *  (https://github.com/gis4dis/poster/wiki/Interface-between-MC-client-&-CG)
     */
    constructor(property, feature, valueIdx, resolution, maxPropertyValue, minPropertyValue, maxAnomalyValue, minAnomalyValue) {
        super(property, feature, valueIdx, resolution, maxPropertyValue, minPropertyValue, maxAnomalyValue, minAnomalyValue);
    }

    /**
     * Building SVG icon based on property_value and property_anomaly_rates
     * @returns {string} SVG icon
     */
    createSVG() {
        let propertyValue = Symbolizer.normalize(this.feature.properties.property_values[this.valueIdx],
            this.minPropertyValue, this.maxPropertyValue) * 100;

        let propertyAnomalyValue = Symbolizer.normalize(this.feature.properties.property_anomaly_rates[this.valueIdx],
            this.minAnomalyValue, this.maxAnomalyValue) * 100;

        return '<svg width="' + 2*(25 + Math.log(this.resolution) * 2) + '" height="150" version="1.1" xmlns="http://www.w3.org/2000/svg">' +
            '<rect x="0" y="' + (150 - propertyValue) + '" width="' + (25 + Math.log(this.resolution) * 2) + '" height="' + (propertyValue +  Math.log(this.resolution) * 2) + '" style="fill:rgb(0,0,255);stroke-width:0" />' +
            '<rect x="' + (25 + Math.log(this.resolution) * 2) + '" y="' + (150 - propertyAnomalyValue) + '" width="' + (25 + Math.log(this.resolution) * 2) + '" height="' + (propertyAnomalyValue + this.resolution / 10) + '" style="fill:rgb(255,0,0);stroke-width:0" />' +
            '</svg>';
    }

}