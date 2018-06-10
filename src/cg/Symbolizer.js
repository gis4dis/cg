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
     *  (https://github.com/gis4dis/poster/wiki/Interface-between-MC-client-&-CG)
     */
    constructor(property, feature, valueIdx, resolution) {
        this.property = property;
        this.feature = feature;
        this.valueIdx = valueIdx;
        this.resolution = resolution;
    }

    /**
     * Building SVG icon based on property_value and property_anomaly_rates
     * @returns {string} SVG icon
     */
    createSVG() {
        let propertyValue = this.feature.values_.property_values[this.valueIdx] * 15;
        let propertyAnomalyValue = this.feature.values_.property_anomaly_rates[this.valueIdx] * 15;
        console.log(propertyValue);
        console.log(propertyAnomalyValue);

        return '<svg width="60" height="150" version="1.1" xmlns="http://www.w3.org/2000/svg">' +
            '<rect x="0" y="' + (150 - propertyValue) + '" width="30" height="' + propertyValue + '" style="fill:rgb(0,0,255);stroke-width:0" />' +
            '<rect x="30" y="' + (150 - propertyAnomalyValue) + '" width="30" height="' + propertyAnomalyValue + '" style="fill:rgb(255,0,0);stroke-width:0" />' +
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