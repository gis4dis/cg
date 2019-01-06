import Style from 'ol/style/style';
import Icon from 'ol/style/icon';


/** Represents Symbolizer for features. Contains set of operations including creating styles */
export default class Symbolizer {

    /**
     * Instantiating of Symbolizer object
     * @constructor
     * @param {Object.<string, string>} primary_property - values selected by user
     *  (https://github.com/gis4dis/mc-client/blob/e7e4654dbd4f4b3fb468d4b4a21cadcb1fbbc0cf/static/data/properties.json)
     * @param {Object} properties - object of properties
     * @param {Object.GeoJSON} feature - represented as one feature from an Array of GeoJSON Features, each of them includes attributes
     *  (https://github.com/gis4dis/cg/blob/master/data/example.json)
     * @param {number} valueIdx - an index of value that should be used for generalization
     * @param {number} resolution - number, represents projection units per pixel (the projection is EPSG:3857)
     * @param {Object.<array>} minMaxValues - minimum and maximum values (min and max property values, min and max anomaly rates)
     *  (https://github.com/gis4dis/poster/wiki/Interface-between-MC-client-&-CG)
     */
    constructor(primary_property, properties, feature, valueIdx, resolution, minMaxValues) {
        this.primary_property = primary_property;
        this.properties = properties;
        this.feature = feature;
        this.valueIdx = valueIdx;
        this.resolution = resolution;
        this.minMaxValues = minMaxValues;
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
    static createHash(featureId, indexId) {
        return 'featureid' + featureId + 'index' + indexId;
    }

    static getAnomalyColor(value) {
        if (value < 2.5) {
            return 'rgb(0, 153, 51)';
        }
        return 'rgb(255, 0, 0)';
    }

    /**
     * Building SVG icon based on property_value and property_anomaly_rates
     * @param {String} property - name of the property (air_temperature...)
     * @param {number} x - x coordinate of position of symbol
     * @param {number} y - y coordinate of position of symbol
     * @returns {String} SVG icon
     */
    createSVG(property, x, y) {
        let propertyValue = 0;
        let propertyAnomalyValue = 0;
        let anomalyColor = '';

        if (this.cached === true) {/*
            propertyValue = this.feature.properties[property]['values'][this.valueIdx];

            propertyAnomalyValue = this.feature.properties[property]['anomaly_rates'][this.valueIdx];
        } else {*/
            propertyValue = this.feature.values_[property]['values'][this.valueIdx];

            propertyAnomalyValue = this.feature.values_[property]['anomaly_rates'][this.valueIdx];
        }

        anomalyColor = Symbolizer.getAnomalyColor(propertyAnomalyValue);

        return '<svg width="180" height="180" version="1.1" xmlns="http://www.w3.org/2000/svg">'
            + '<circle cx="'+ x +'" cy="'+ y +'" stroke="black" style="fill:'+ anomalyColor +';stroke-width: 1" r="' + (propertyValue +  Math.log(this.resolution) * 2) + '"/>'
            + '</svg>';


        /*return '<svg width="' + 2*(25 + Math.log(this.resolution) * 2) + '" height="150" version="1.1" xmlns="http://www.w3.org/2000/svg">' +
            '<circle cx="0" cy="0" r="' + 10 + '" stroke="black" stroke-width="2" fill="#0066ff" />' +
            '<rect x="0" y="' + (150 - propertyValue) + '" width="' + (25 + Math.log(this.resolution) * 2) + '" height="' + (propertyValue +  Math.log(this.resolution) * 2) + '" style="fill:rgb(0,0,255);stroke-width:0" />' +
            '</svg>';*/
    }

    /**
     * Creating style based on property value.
     *  (https://github.com/gis4dis/poster/wiki/Interface-between-MC-client-&-CG)
     * @returns {_ol_style_Style_} built style for vector layer
     */
    //TODO change with different styles for different properties
    buildSVGSymbol(property) {

        switch (property) {
            case 'air_temperature':
                return this.createSVG(property, 90, 30);
            case 'ground_air_temperature':
                return this.createSVG(property, 150, 60);
            case 'soil_temperature':
                return this.createSVG(property, 140, 135);
            case 'precipitation':
                return this.createSVG(property, 50, 135);
            case 'air_humidity':
                return this.createSVG(property, 30, 60);
        }
    }

    createSymbol() {
        let symbols = [];

        for (let i in this.properties) {
            if (this.feature.values_.hasOwnProperty(this.properties[i].name_id)) {
                symbols.push(this.buildSVGSymbol(this.properties[i].name_id));
            }
            /*if (this.cached === true) {
                if (this.feature.properties.hasOwnProperty(this.properties[i].name_id)) {
                    symbols.push(this.buildSVGSymbol(this.properties[i].name_id));
                }
            } else {
                if (this.feature.values_.hasOwnProperty(this.properties[i].name_id)) {
                    symbols.push(this.buildSVGSymbol(this.properties[i].name_id));
                }
            }*/
        }

        let svg = '<svg width="180" height="180" version="1.1" xmlns="http://www.w3.org/2000/svg">';
        for (let j in symbols) {
            svg += symbols[j];
        }
        svg += '</svg>';

        /*return new Style({
            image: new Icon({
                opacity: 1,
                src: 'data:image/svg+xml;utf8,' + svg,
                scale: 0.2
            })
        });*/
        /*return new Style({
            image: new Icon({
                opacity: 1,
                src: 'https://svgur.com/i/AFJ.svg',
                scale: .1
            })
        });*/
        return [
            //drop centered
            new Style({
                image: new Icon({
                    anchor: [1,1],
                    opacity: 1,
                    src: '/static/symbolization/drop_low.svg',
                    scale: .2
                })
            }),
            //drop
            new Style({
                image: new Icon({
                    anchor: [0.5,0.5],
                    opacity: 0.3,
                    src: '/static/symbolization/drop_middle.svg',
                    scale: .2
                })
            }),
            //drop
            new Style({
                image: new Icon({
                    anchor: [0,0],
                    opacity: 0.6,
                    src: '/static/symbolization/drop_high.svg',
                    scale: .2
                })
            }),
            //drop
            new Style({
                image: new Icon({
                    anchor: [1,0],
                    opacity: 0.8,
                    src: '/static/symbolization/drop.svg',
                    scale: .2
                })
            }),
            //thermometer
            new Style({
                image: new Icon({
                    anchor: [0,1],
                    opacity: 1,
                    src: '/static/symbolization/thermometer.svg',
                    scale: .2
                })
            })/*,
            //thermometer
            new Style({
                image: new Icon({
                    opacity: 1,
                    src: 'https://svgur.com/i/AGD.svg',
                    scale: .2
                })
            }),
            //drop
            new Style({
                image: new Icon({
                    opacity: 1,
                    src: 'https://svgur.com/i/AFJ.svg',
                    scale: .1
                })
            }),
            //drop
            new Style({
                image: new Icon({
                    opacity: 1,
                    src: 'https://svgur.com/i/AFJ.svg',
                    scale: .1
                })
            }),*/
        ];
    }
}