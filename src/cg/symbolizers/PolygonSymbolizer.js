import Style from 'ol/style/style';
import Icon from 'ol/style/icon';
import Stroke from 'ol/style/stroke';
import Fill from 'ol/style/fill';
import Symbolizer from './Symbolizer';


/** Represents Symbolizer for features. Contains set of operations including creating styles */
export default class PolygonSymbolizer extends Symbolizer {

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
     * Creating _ol_style_Style_ object
     * @returns {_ol_style_Style_} built style for styleFunction
     */
    buildStyle() {
        let _myStroke = new Stroke({
            color : 'rgba(255,0,0,1.0)',
            width : 1
        });

        let _myFill = new Fill({
            color: 'rgba(255,0,0,1.0)'
        });

        return new Style({
            stroke : _myStroke,
            fill : _myFill
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