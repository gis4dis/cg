import Style from 'ol/style/style';
import Icon from "ol/style/icon";


/** Represents Symbolizer for Vector layer and features. Contains set of operations over features and styles */
export default class Symbolizer {

    /**
     * Instantiating of Symbolizer object
     * @constructor
     * @param {feature} feature - array of GeoJSON Features
     *  (https://github.com/gis4dis/poster/wiki/Interface-between-MC-client-&-CG)
     */
    constructor(property, feature, valueIdx, resolution) {
        this.property = property;
        this.feature = feature;
        this.valueIdx = valueIdx;
        this.resolution = resolution;
    }

    createSVG() {
        let propertyValue = this.feature.values_.property_values[this.valueIdx] * 15;
        let propertyAnomalyValue = this.feature.values_.property_anomaly_rates[this.valueIdx] * 15;
        console.log(propertyValue);
        console.log(propertyAnomalyValue);

        return '<svg width="60" height="150" version="1.1" xmlns="http://www.w3.org/2000/svg">' +
            '<rect x="0" y="'+ (150 - propertyValue) +'" width="30" height="'+ propertyValue +'" style="fill:rgb(0,0,255);stroke-width:0" />' +
            '<rect x="30" y="'+ (150 - propertyAnomalyValue) +'" width="30" height="'+ propertyAnomalyValue +'" style="fill:rgb(255,0,0);stroke-width:0" />' +
            '</svg>';
    }

    //TODO now creating the same style for every property
    /**
     * Creating _ol_style_Style_ object
     * @returns {_ol_style_Style_} builded style for vector layer
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

    //TODO set some defult property
    /**
     * Creating default _ol_style_Style_ object. In this time only call buildStyle() method
     */
    buildDefaultStyle() {
        return Symbolizer.buildStyle();
    }

    /**
     * Creating style based on property value.
     *  More info: https://github.com/gis4dis/poster/wiki/Interface-between-MC-client-&-CG
     * @param {object} property - Javascript object based on property parameter from specification
     * @returns {_ol_style_Style_} builded style for vector layer
     */
    styleBasedOnProperty() {
        switch(this.property.name_id) {
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