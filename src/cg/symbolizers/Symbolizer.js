import Style from 'ol/style/style';
import Icon from 'ol/style/icon';


/** Represents Symbolizer for features. Contains set of operations including creating styles */
export default class Symbolizer {

    /**
     * Instantiating of Symbolizer object
     * @constructor
     * @param {Object.<string, string>} primary_property - values selected by user
     *  (https://github.com/gis4dis/mc-client/blob/e7e4654dbd4f4b3fb468d4b4a21cadcb1fbbc0cf/static/data/properties.json)
     * @param {Object.GeoJSON} feature - represented as one feature from an Array of GeoJSON Features, each of them includes attributes
     *  (https://github.com/gis4dis/cg/blob/master/data/example.json)
     * @param {number} valueIdx - an index of value that should be used for generalization
     * @param {number} resolution - number, represents projection units per pixel (the projection is EPSG:3857)
     * @param {Object.<array>} minMaxValues - minimum and maximum values (min and max property values, min and max anomaly rates)
     *  (https://github.com/gis4dis/poster/wiki/Interface-between-MC-client-&-CG)
     */
    constructor(primary_property, properties, feature, valueIdx, resolution, minMaxValues, cached) {
        this.primary_property = primary_property;
        this.properties = properties;
        this.feature = feature;
        this.valueIdx = valueIdx;
        this.resolution = resolution;
        this.minMaxValues = minMaxValues;
        this.cached = cached;
    }

    /**
     * Returning max value from geojson array with specific key
     * @param {Object.GeoJSON} geojson - representing collection of features
     * @param {String} name_id - name_id of property
     * @param {String} type - name of the key from feature where is array with values
     * @returns {number} - Max value from array
     */
    static getMaxValue(geojson, name_id, type) {
        let maxValue = null;
        geojson.features.forEach(function (feature) {
            console.log(feature);
            if (maxValue === null || maxValue < Math.max(...feature.properties[name_id][type])) {
                maxValue = Math.max(...feature.properties[name_id][type]);
            }
        });

        return maxValue;
    }

    /**
     * Returning min value from geojson array with specific key
     * @param {Object.GeoJSON} geojson - representing collection of features
     * @param {String} name_id - name_id of property
     * @param {String} type - name of the key from feature where is array with values
     * @returns {number} - Min value from array
     */
    static getMinValue(geojson, name_id, type) {
        let minValue = null;
        geojson.features.forEach(function (feature) {
            if (minValue === null || minValue > Math.min(...feature.properties[name_id][type])) {
                minValue = Math.min(...feature.properties[name_id][type]);
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
     * Creating hash based on values of SVG parameters
     * @returns {string} hash
     */
    static createHash(nameId, value, anomalyRate) {
        //console.log('hash metod');
        //console.log(id);
        //console.log(nameId);
        //console.log(index);
        return nameId + 'value' + value + 'anomaly' + anomalyRate;
    }

    /**
     * Building SVG icon based on property_value and property_anomaly_rates
     * @returns {string} SVG icon
     */
    createSVG() {
        //TODO fix minMaxValues[primary_property] for all properties
        let propertyValue = 0;
        let propertyAnomalyValue = 0;
        let anomalyColor = '';

        if (this.cached === true) {
            propertyValue = this.feature.properties[this.primary_property]['values'][this.valueIdx];

            propertyAnomalyValue = this.feature.properties[this.primary_property]['anomaly_rates'][this.valueIdx];
        } else {
            console.log('Features');
            console.log(this.feature);
            propertyValue = this.feature.values_[this.primary_property]['values'][this.valueIdx];

            //console.log('anomaly rates');
            //console.log(this.feature.values_[this.primary_property]['anomaly_rates'][this.valueIdx]);
            propertyAnomalyValue = this.feature.values_[this.primary_property]['anomaly_rates'][this.valueIdx];
        }

        //console.log('MINMAXVALUES');
        //console.log(this.minMaxValues);

        if (propertyAnomalyValue < 2.5) {
            anomalyColor = 'rgb(0, 153, 51)';
        } else {
            anomalyColor = 'rgb(255, 0, 0)';
        }


        return '<svg width="120" height="120" version="1.1" xmlns="http://www.w3.org/2000/svg">'
            + '<circle cx="60" cy="60" stroke="black" style="fill:'+ anomalyColor +';stroke-width: 1" r="' + (propertyValue +  Math.log(this.resolution) * 2) + '"/>'
            + '</svg>';


        /*return '<svg width="' + 2*(25 + Math.log(this.resolution) * 2) + '" height="150" version="1.1" xmlns="http://www.w3.org/2000/svg">' +
            '<circle cx="0" cy="0" r="' + 10 + '" stroke="black" stroke-width="2" fill="#0066ff" />' +
            '<rect x="0" y="' + (150 - propertyValue) + '" width="' + (25 + Math.log(this.resolution) * 2) + '" height="' + (propertyValue +  Math.log(this.resolution) * 2) + '" style="fill:rgb(0,0,255);stroke-width:0" />' +
            '</svg>';*/
    }

    /**
     * Creating _ol_style_Style_ object
     * @returns {_ol_style_Style_} built style for styleFunction
     */
    buildStyle(topic) {
        //console.log('SVG');
        //console.log(this.createSVG());
        if (topic === 'air_temperature') {
            return new Style({
                image: new Icon({
                    opacity: 1,
                    src: 'data:image/svg+xml;utf8,' + this.createSVG(),
                    scale: 0.3
                })
            });
        } else if (topic === 'ground_air_temperature') {
            return new Style({
                image: new Icon({
                    opacity: 1,
                    src: 'data:image/svg+xml;utf8,' +
                    '<svg width="24" height="24" version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M24 22h-24l12-20z"/></svg>',
                    scale: 0.5
                })
            });
        }
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
    styleBasedOnProperty(property) {

            switch (property) {
                case 'air_temperature':
                    return this.buildStyle(property);
                case 'ground_air_temperature':
                    return this.buildStyle(property);
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