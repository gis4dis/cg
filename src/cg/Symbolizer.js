import ol_format_GeoJSON from "ol/format/geojson";
import Fill from 'ol/style/fill';
import Stroke from 'ol/style/stroke';
import Style from 'ol/style/style';

/** Represents Symbolizer for Vector layer and features. Contains set of operations over features and styles */
export default class Symbolizer {

    /**
     * Instantiating of Symbolizer object
     * @constructor
     * @param {geojson} geojson - array of GeoJSON Features
     *  (https://github.com/gis4dis/poster/wiki/Interface-between-MC-client-&-CG)
     */
    constructor(geojson) {
        this.features = Symbolizer.makeOlFeatures(geojson);
        this.styles = [];
    }

    //TODO now creating the same style for every property
    /**
     * Creating _ol_style_Style_ object
     * @returns {_ol_style_Style_} builded style for vector layer
     */
    static buildStyle() {
        let fill = new Fill({
            color: 'rgba(255,255,255,0.4)'
        });
        let stroke = new Stroke({
            color: '#3399CC',
            width: 1.25
        });
        return new Style({
            fill: fill,
            stroke: stroke,
        });
    }

    //TODO set some defult property
    /**
     * Creating default _ol_style_Style_ object. In this time only call buildStyle() method
     */
    static buildDefaultStyle() {
        return Symbolizer.buildStyle();
    }

    /**
     * Creating style based on property value.
     *  More info: https://github.com/gis4dis/poster/wiki/Interface-between-MC-client-&-CG
     * @param {object} property - Javascript object based on property parameter from specification
     * @returns {_ol_style_Style_} builded style for vector layer
     */
    static styleBasedOnProperty(property) {
        switch(property.name_id) {
            case 'air_temperature':
                return Symbolizer.buildStyle();
            case 'ground_air_temperature':
                return Symbolizer.buildStyle();
            case 'soil_temperature':
                return Symbolizer.buildStyle();
            case 'precipitation':
                return Symbolizer.buildStyle();
            case 'air_humidity':
                return Symbolizer.buildStyle();
            default:
                Symbolizer.buildDefaultStyle();
        }
    }

    /**
     * Making Open Layers features from GeoJSON
     * @param geojson - Array of features in GeoJSON format
     * @returns {Array<ol.Feature>}
     */
    static makeOlFeatures(geojson) {
         return (new ol_format_GeoJSON()).readFeatures(geojson, {
            dataProjection: 'EPSG:4326',
            featureProjection: 'EPSG:3857',
        });
    }

    /**
     * Adding style to array
     * @param {_ol_style_Style_} style - Open Layers style
     */
    addStyle(style) {
        this.styles.push(style);
    }
}