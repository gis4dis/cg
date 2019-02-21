import Style from 'ol/style/style';
import Icon from 'ol/style/icon';


/* Constants of position of symbols */
const POSITIONS = {
    'PRIMARY': [1,1],
    'SECONDARY': [0,0],
    'TERTIARY': [1,0],
    'OTHER': [0,1]
};

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
     * Normalize value to MIN_RANGE-MAX_RANGE range
     * @param {number} value - value for normalization
     * @param {number} min - minimum value of array
     * @param {number} max - maximum value of array
     * @returns {number} normalized value
     */
    static normalize(value, min, max) {
        if (max === min) {
            return (MAX_RANGE - MIN_RANGE) / 2;
        }

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
        if (value < 0.5) {
            return 'middle';
        } else if (value < 2.5) {
            return 'low';
        }
        return 'high';
    }

    getSymbolPosition(nameId) {
        for (let property of this.properties) {
            if (property.name_id === nameId) {
                return POSITIONS[property.position];
            }
        }

        throw new Error('Property symbol position not found');
    }

    /**
     * Building SVG icon based on property_value and property_anomaly_rates
     * @param {Object} nameId - symbol object
     * @param {Number} normalizedPropertyValue - normalized property (to a range MIN_RANGE and MAX_RANGE) value from values array from feature
     * @returns {_ol_style_Style_} OpenLayers style object
     */
    buildStyle(nameId, normalizedPropertyValue, anomalyValue) {
        let propertyAnomalyValue = 0;
        let anomalyInterval = '';

        let coordinates = this.getSymbolPosition(nameId);
        
        anomalyInterval = Symbolizer.getAnomalyInterval(anomalyValue);

        return new Style({
            image: new Icon({
                anchor: coordinates,
                opacity: 1,
                src: `${SYMBOL_PATH}/${nameId}_${anomalyInterval}.svg`,
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
     * @param {String} nameId - name of the property (air_temperature...)
     * @returns {Number} Normalized property value used for size of symbol
     */
    getNormalizedPropertyValue(nameId, value) {
        let normalizedPropertyValue = 0;

        // Value of property (e.g. air_temperature) is normalized from MIN_RANGE to MAX_RANGE
        return Symbolizer.normalize(value, this.minMaxValues[nameId]['min'], this.minMaxValues[nameId]['max']);
    }

    /**
     * Sorting properties based on primary property
     * @param {Object} properties - object of properties
     * @param {String} primary_property - value selected by user
     *  (https://github.com/gis4dis/mc-client/blob/e7e4654dbd4f4b3fb468d4b4a21cadcb1fbbc0cf/static/data/properties.json)
     * @returns {Object} - sorted properties with position symbol parameter
     */
    static sortProperties(properties, primary_property) {
        let positions = ['PRIMARY', 'SECONDARY', 'TERTIARY', 'OTHER'];

        let positionsCounter = 1;
        for (let i in properties) {
            if (properties[i].name_id === primary_property) {
                properties[i].position = positions[0];
            } else {
                properties[i].position = positions[positionsCounter];
                positionsCounter += 1;
            }
        }

        return properties;
    }

    /**
     * Creates array of OL styles objects based on property name_id value
     * @returns {Array} styles - array of OL styles
     */
    createSymbol() {
        let styles = [];

        let primaryCombinedSymbol = this.feature.values_.combinedSymbol.primarySymbol;
        if (primaryCombinedSymbol.nameId !== null) {
            let primaryNormalizedPropertyValue = this.getNormalizedPropertyValue(primaryCombinedSymbol.nameId, primaryCombinedSymbol.value);
            styles.push(this.buildStyle(primaryCombinedSymbol.nameId, primaryNormalizedPropertyValue, primaryCombinedSymbol.anomalyValue));
        }

        let secondaryCombinedSymbol = this.feature.values_.combinedSymbol.secondarySymbol;
        if (secondaryCombinedSymbol.nameId !== null) {
            let secondaryNormalizedPropertyValue = this.getNormalizedPropertyValue(secondaryCombinedSymbol.nameId, secondaryCombinedSymbol.value);
            styles.push(this.buildStyle(secondaryCombinedSymbol.nameId, secondaryNormalizedPropertyValue, secondaryCombinedSymbol.anomalyValue));
        }

        let tertiaryCombinedSymbol = this.feature.values_.combinedSymbol.tertiarySymbol;
        if (tertiaryCombinedSymbol.nameId !== null) {
            let tertiaryNormalizedPropertyValue = this.getNormalizedPropertyValue(tertiaryCombinedSymbol.nameId, tertiaryCombinedSymbol.value);
            styles.push(this.buildStyle(tertiaryCombinedSymbol.nameId, tertiaryNormalizedPropertyValue, tertiaryCombinedSymbol.anomalyValue));
        }

        for (let otherSymbol of this.feature.values_.combinedSymbol.otherSymbols) {
            if (otherSymbol.nameId !== null) {
                let otherNormalizedPropertyValue = this.getNormalizedPropertyValue(otherSymbol.nameId, otherSymbol.value);
                styles.push(this.buildStyle(otherSymbol.nameId, otherNormalizedPropertyValue, otherSymbol.anomalyValue));
            }
        }

        return styles;
    }
}