import Style from 'ol/style/style';
import Icon from 'ol/style/icon';


/* Constants of position of symbols */
const PRECIPITATION = [1,1];
const AIR_TEMPERATURE = [0,0];
const PM10 = [1,0];
const STREAM_FLOW = [0,1];

const SYMBOL_PATH = '/static/symbolization';

const MIN_RANGE = 0.2;
const MAX_RANGE = 0.6;


/** Represents Symbolizer for features. Contains set of operations including creating styles */
export default class Symbolizer {

    /**
     * Instantiating of Symbolizer object
     * @constructor
     * @param {String} primary_property - value selected by user
     *  (https://github.com/gis4dis/mc-client/blob/e7e4654dbd4f4b3fb468d4b4a21cadcb1fbbc0cf/static/data/properties.json)
     * @param {Object} properties - object of properties
     * @param {ol.Feature} feature - represented as one feature from an Array of GeoJSON Features, each of them includes attributes
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
     * @param {ol.Feature} features - array of OL features
     * @param {String} name_id - name_id of property
     * @returns {number} - Max value from array
     */
    static getMaxValue(features, name_id) {
        let maxValue = null;

        features.forEach(function (feature) {
            if (feature.values_.hasOwnProperty(name_id)) {
                if (maxValue === null || maxValue < Math.max(...feature.values_[name_id]['values'])) {
                    maxValue = Math.max(...feature.values_[name_id]['values']);
                }
            }
        });

        return maxValue;
    }

    /**
     * Returning min value from geojson array with specific key
     * @param {ol.Feature} features - array of OL features
     * @param {String} name_id - name_id of property
     * @returns {number} - Min value from array
     */
    static getMinValue(features, name_id) {
        let minValue = null;

        features.forEach(function (feature) {
            if (feature.values_.hasOwnProperty(name_id)) {
                if (minValue === null || minValue > Math.min(...feature.values_[name_id]['values'])) {
                    minValue = Math.min(...feature.values_[name_id]['values']);
                }
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
        return (value - min) / (max - min) * (MAX_RANGE - MIN_RANGE) + MIN_RANGE;
    }

    /**
     * Creating hash based on values of SVG parameters
     * @param {String} featureId - ID of feature
     * @param {String} primary_property - primary property selected by user in MC client
     * @param {Number} indexId - index for selecting value and anomaly rates from arrays
     * @returns {string} hash
     */
    static createHash(featureId, primary_property, indexId) {
        return `featureid${featureId}primaryproperty${primary_property}index${indexId}`;
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
     * @param {Number} normalizedPropertyValue - normalized property (to a range MIN_RANGE and MAX_RANGE) value from values array from feature
     * @returns {_ol_style_Style_} OpenLayers style object
     */
    buildStyle(property, coordinates, normalizedPropertyValue) {
        let propertyAnomalyValue = 0;
        let anomalyInterval = '';

        propertyAnomalyValue = this.feature.values_[property]['anomaly_rates'][this.valueIdx];
        anomalyInterval = Symbolizer.getAnomalyInterval(propertyAnomalyValue);

        return new Style({
            image: new Icon({
                anchor: coordinates,
                opacity: 1,
                src: `${SYMBOL_PATH}/${property}_${anomalyInterval}.svg`,
                scale: normalizedPropertyValue
            })
        });
    }

    /**
     * Return primary OL style. Primary property is selected by user in MC client
     * @param {Array.<number>} coordinates - coordinates of position of symbol
     * @param {Number} normalizedPropertyValue - normalized property (to a range MIN_RANGE and MAX_RANGE) value from values array from feature
     * @returns {_ol_style_Style_} OpenLayers style object
     */
    addPrimaryStyle(coordinates, normalizedPropertyValue) {
        return new Style({
            image: new Icon({
                anchor: coordinates,
                opacity: 1,
                src: `${SYMBOL_PATH}/primary.svg`,
                scale: normalizedPropertyValue
            })
        });
    }

    /**
     * Function computes normalizedPropertyValue of specific feature
     * @param {String} property - name of the property (air_temperature...)
     * @returns {Number} Normalized property value used for size of symbol
     */
    getNormalizedPropertyValue(property) {
        let normalizedPropertyValue = 0;

        // Value of property (e.g. air_temperature) is normalized from 0 to 1
        return Symbolizer.normalize(this.feature.values_[property]['values'][this.valueIdx], this.minMaxValues[property]['min'], this.minMaxValues[property]['max']);
    }

    /**
     * Creates array of OL styles objects based on property name_id value
     * @returns {Array} styles - array of OL styles
     */
    createSymbol() {
        let styles = [];

        for (let i in this.properties) {
            if (this.feature.values_.hasOwnProperty(this.properties[i].name_id)) {
                let property = this.properties[i].name_id;
                let normalizedPropertyValue = 0;

                switch (property) {
                    case 'precipitation':
                        normalizedPropertyValue = this.getNormalizedPropertyValue(property);

                        if (this.primary_property === property) {
                            styles.push(this.addPrimaryStyle(PRECIPITATION, normalizedPropertyValue))
                        }

                        styles.push(this.buildStyle(property, PRECIPITATION, normalizedPropertyValue));
                        break;
                    case 'air_temperature':
                        normalizedPropertyValue = this.getNormalizedPropertyValue(property);

                        if (this.primary_property === property) {
                            styles.push(this.addPrimaryStyle(AIR_TEMPERATURE, normalizedPropertyValue))
                        }

                        styles.push(this.buildStyle(property, AIR_TEMPERATURE, normalizedPropertyValue));
                        break;
                    case 'pm10':
                        normalizedPropertyValue = this.getNormalizedPropertyValue(property);

                        if (this.primary_property === property) {
                            styles.push(this.addPrimaryStyle(PM10, normalizedPropertyValue))
                        }

                        styles.push(this.buildStyle(property, PM10, normalizedPropertyValue));
                        break;
                    case 'stream_flow':
                        normalizedPropertyValue = this.getNormalizedPropertyValue(property);

                        if (this.primary_property === property) {
                            styles.push(this.addPrimaryStyle(STREAM_FLOW, normalizedPropertyValue))
                        }

                        styles.push(this.buildStyle(property, STREAM_FLOW, normalizedPropertyValue));
                        break;
                }
            }
        }
        //console.log(styles);

        return styles;
    }
}