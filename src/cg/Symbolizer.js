import Style from 'ol/style/style';
import Icon from "ol/style/icon";


/** Represents Symbolizer for features. Contains set of operations including building styles */
export default class Symbolizer {

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
        this.property = property;
        this.feature = feature;
        this.valueIdx = valueIdx;
        this.resolution = resolution;

        this.maxPropertyValue = maxPropertyValue;
        this.minPropertyValue = minPropertyValue;
        this.maxAnomalyValue = maxAnomalyValue;
        this.minAnomalyValue = minAnomalyValue;
    }

    /**
     * Returning max value from geojson array with specific key
     * @param {Object.GeoJSON} geojson - representing collection of features
     * @param {String} type - name of the key from feature where is array with values
     * @returns {number} - Max value from array
     */
    static getMaxValue(geojson, type) {
        let maxValue = null;
        geojson.features.forEach(function (feature) {
            if (maxValue === null || maxValue < Math.max(...feature.properties[type])) {
                maxValue = Math.max(...feature.properties[type]);
            }
        });

        return maxValue;
    }

    /**
     * Returning min value from geojson array with specific key
     * @param {Object.GeoJSON} geojson - representing collection of features
     * @param {String} type - name of the key from feature where is array with values
     * @returns {number} - Min value from array
     */
    static getMinValue(geojson, type) {
        let minValue = null;
        geojson.features.forEach(function (feature) {
            if (minValue === null || minValue > Math.min(...feature.properties[type])) {
                minValue = Math.min(...feature.properties[type]);
            }
        });

        return minValue;
    }

    /**
     * Normalize value to 0-1 range
     * @param {number} value - value for normalization
     * @param {number} min - minimum value of array
     * @param {number} max - maximum value of array
     * @returns {number} normalized value
     */
    static normalize(value, min, max) {
        return (value - min) / (max - min);
    }

    /**
     * Building SVG icon based on property_value and property_anomaly_rates
     * @returns {string} SVG icon
     */
    createSVG() {
        let propertyValue = Symbolizer.normalize(this.feature.values_.property_values[this.valueIdx],
            this.minPropertyValue, this.maxPropertyValue) * 100;

        let propertyAnomalyValue = Symbolizer.normalize(this.feature.values_.property_anomaly_rates[this.valueIdx],
            this.minAnomalyValue, this.maxAnomalyValue) * 100;

        return '<svg width="' + 2*(25 + Math.log(this.resolution) * 2) + '" height="150" version="1.1" xmlns="http://www.w3.org/2000/svg">' +
            '<rect x="0" y="' + (150 - propertyValue) + '" width="' + (25 + Math.log(this.resolution) * 2) + '" height="' + (propertyValue +  Math.log(this.resolution) * 2) + '" style="fill:rgb(0,0,255);stroke-width:0" />' +
            '<rect x="' + (25 + Math.log(this.resolution) * 2) + '" y="' + (150 - propertyAnomalyValue) + '" width="' + (25 + Math.log(this.resolution) * 2) + '" height="' + (propertyAnomalyValue + this.resolution / 10) + '" style="fill:rgb(255,0,0);stroke-width:0" />' +
            '</svg>';
    }

    /**
     * Creating _ol_style_Style_ object
     * @returns {_ol_style_Style_} built style for styleFunction
     */
    buildStyle() {
        return new Style({
            image: new Icon({
                opacity: .7,
                src: 'data:image/svg+xml;utf8,' + this.createSVG(),
                scale: .3
            })
        });
    }

    /**
     * Creating default _ol_style_Style_ object. Prepared to the future
     * @returns {_ol_style_Style_} default style
     */
    buildDefaultStyle() {
        return this.buildStyle();
    }

    /**
     * Creating style based on property value.
     *  (https://github.com/gis4dis/poster/wiki/Interface-between-MC-client-&-CG)
     * @returns {_ol_style_Style_} built style for vector layer
     */
    //TODO change with different styles for different properties
    styleBasedOnProperty() {
        switch (this.property.name_id) {
            case 'air_temperature':
                return this.buildStyle();
            case 'ground_air_temperature':
                return this.buildStyle();
            case 'soil_temperature':
                return this.buildStyle();
            case 'precipitation':
                return this.buildStyle();
            case 'air_humidity':
                return this.buildStyle();
            default:
                return this.buildDefaultStyle();
        }
    }

}