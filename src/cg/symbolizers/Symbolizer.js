import Style from 'ol/style/style';
import Icon from 'ol/style/icon';


/* Constants of position of symbols */
const PRECIPITATION = [1,1];
const AIR_TEMPERATURE = [0,0];
const PM10 = [1,0];
const STREAM_FLOW = [0,1];

const SYMBOL_PATH = '/static/symbolization';


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

    /**
     * Returning name of the interval base on anomaly rate value
     * @returns {String} interval - interval (low, middle or high) of anomaly rate
     * */
    static getAnomalyInterval(value) {
        if (value < 2.5) {
            return 'middle';
        } else if (value < 1) {
            return 'low';
        }
        return 'high';
    }

    /**
     * Building SVG icon based on property_value and property_anomaly_rates
     * @param {String} property - name of the property (air_temperature...)
     * @param {Array.<number>} coordinates - coordinates of position of symbol
     * @returns {_ol_style_Style_} OpenLayers style object
     */
    buildStyle(property, coordinates) {
        let propertyValue = 0;
        let propertyAnomalyValue = 0;
        let anomalyInterval = '';

        propertyValue = this.feature.values_[property]['values'][this.valueIdx];

        propertyAnomalyValue = this.feature.values_[property]['anomaly_rates'][this.valueIdx];
        anomalyInterval = Symbolizer.getAnomalyInterval(propertyAnomalyValue);

        console.log(`${SYMBOL_PATH}/${property}_${anomalyInterval}.svg`);
        return new Style({
            image: new Icon({
                anchor: coordinates,
                opacity: 1,
                src: `${SYMBOL_PATH}/${property}_${anomalyInterval}.svg`,
                scale: .2
            })
        })
    }

    createSymbol() {
        let styles = [];

        for (let i in this.properties) {
            if (this.feature.values_.hasOwnProperty(this.properties[i].name_id)) {
                let property = this.properties[i].name_id;

                switch (property) {
                    case 'precipitation':
                        styles.push(this.buildStyle(property, PRECIPITATION));
                        break;
                    case 'air_temperature':
                        styles.push(this.buildStyle(property, AIR_TEMPERATURE));
                        break;
                    case 'pm10':
                        styles.push(this.buildStyle(property, PM10));
                        break;
                    case 'stream_flow':
                        styles.push(this.buildStyle(property, STREAM_FLOW));
                        break;
                }
            }
        }
        console.log(styles);

        return styles;
        /*return [
            //drop centered
            new Style({
                image: new Icon({
                    anchor: [1,1],
                    opacity: 1,
                    src: '/static/symbolization/precipitation_low.svg',
                    scale: .2
                })
            }),
            //drop
            new Style({
                image: new Icon({
                    anchor: [0.5,0.5],
                    opacity: 0.3,
                    src: '/static/symbolization/precipitation_middle.svg',
                    scale: .2
                })
            }),
            //drop
            new Style({
                image: new Icon({
                    anchor: [0,0],
                    opacity: 0.6,
                    src: '/static/symbolization/precipitation_high.svg',
                    scale: .2
                })
            }),
            //drop
            new Style({
                image: new Icon({
                    anchor: [1,0],
                    opacity: 0.8,
                    src: '/static/symbolization/precipitation.svg',
                    scale: .2
                })
            }),
            //thermometer
            new Style({
                image: new Icon({
                    anchor: [0,1],
                    opacity: 1,
                    src: '/static/symbolization/air_temperature.svg',
                    scale: .2
                })
            })
        ];*/
    }
}