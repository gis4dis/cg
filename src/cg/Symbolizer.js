import ol_format_GeoJSON from "ol/format/geojson";
let ol_style_fill = require('ol/style/fill').default;
let ol_style_style = require('ol/style/style').default;
let ol_style_circle = require('ol/style/circle').default;
let ol_style_stroke = require('ol/style/stroke').default;
let ol_geom_polygon = require('ol/geom/polygon').default;
let ol_style_regularshape = require('ol/style/regularshape').default;


/** Represents Symbolizer for Vector layer and features. Contains set of operations over features and styles */
export default class Symbolizer {

    /**
     * Instantiating of Symbolizer object
     * @constructor
     * @param {feature} feature - array of GeoJSON Features
     *  (https://github.com/gis4dis/poster/wiki/Interface-between-MC-client-&-CG)
     */
    constructor(features, valueIdx) {
        this.valueIdx = valueIdx;
        this.features = Symbolizer.makeOlFeatures(features);
        this.styles = [];
    }



    //TODO now creating the same style for every property
    /**
     * Creating _ol_style_Style_ object
     * @returns {_ol_style_Style_} builded style for vector layer
     */
    static buildStyle() {
        return new ol_style_style({
            image: new ol_style_circle({
                fill: new ol_style_fill({ color: [255,0,0,1] }),
                stroke: new ol_style_stroke({ color: [0,0,0,1] }),
                radius: 5,//this.feature.values_.property_values[this.valueIdx],
            }),
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
                return Symbolizer.buildDefaultStyle();
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