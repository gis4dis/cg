import Style from 'ol/style/style';
import Icon from 'ol/style/icon';
import {featureInfo} from '../generalize';
import VGISymbolizer from "./VGISymbolizer";


/* Constants of position of symbols */
const POSITIONS = {
    'PRIMARY': [1, 1],
    'SECONDARY': [0, 1],
    'TERTIARY': [1, 0],
    'OTHER': [0, 0]
};

const SYMBOL_PATH = '/static/symbolization';

const MIN_RANGE = 0.2;
const MAX_RANGE = 0.6;


/** Represents Symbolizer for features. Contains set of operations including creating styles */
export default class Symbolizer {

    /**
     * Instantiating of Symbolizer object
     * @constructor
     *  (https://github.com/gis4dis/mc-client/blob/e7e4654dbd4f4b3fb468d4b4a21cadcb1fbbc0cf/static/data/properties.json)
     * @param {Object} properties - object of properties
     * @param {Feature} feature - represented as one feature from an Array of GeoJSON Features, each of them includes attributes
     * @param {number} resolution - resolution of OpenLayer map
     * @param {Object[]} minMaxValues - object of minimum and maximum values
     *  (https://github.com/gis4dis/cg/blob/master/data/example.json)
     */
    constructor(properties, feature, resolution, minMaxValues) {
        this.properties = properties;
        this.feature = feature;
        this.minMaxValues = minMaxValues;
        this.resolution = resolution;
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
            return (MAX_RANGE + MIN_RANGE) / 2;
        }
        return (value - min) / (max - min) * (MAX_RANGE - MIN_RANGE) + MIN_RANGE;
    }

    /**
     * Creating hash based on values of SVG parameters
     * @param {String} featureId - ID of feature
     * @param {String} primary_property - primary property selected by user in MC client
     * @param {number} indexId - index for selecting value and anomaly rates from arrays
     * @returns {string} hash
     */
    /*static createHash(featureId, primary_property, indexId) {
        return `featureid${featureId}primaryproperty${primary_property}index${indexId}`;
    }*/

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

    /**
     * Returns position of symbol based on property nameId
     * @param {String} nameId - name of the property (air_temperature...)
     * @returns {number[]} x and y coordinates in array
     */
    getSymbolPosition(nameId) {
        for (let property of this.properties) {
            if (property.name_id === nameId) {
                return POSITIONS[property.position];
            }
        }
        throw new Error('Property symbol position not found');
    }

    /**
     * Builds OpenLayers style based on combinedSymbol and normalized property value
     * @param {CombinedSymbol} symbol - symbol
     * @param {number} normalizedPropertyValue - normalized property value (to a range MIN_RANGE and MAX_RANGE)
     * @returns {Style} OpenLayers style object
     */
    buildStyle(symbol, normalizedPropertyValue) {
        let anomalyInterval = '';
        let coordinates = this.getSymbolPosition(symbol.nameId);

        anomalyInterval = Symbolizer.getAnomalyInterval(symbol.anomalyValue);

        if (symbol.grouped === true) {
            anomalyInterval += '_agg';
        }

        return new Style({
            image: new Icon({
                anchor: coordinates,
                opacity: 1,
                src: `${SYMBOL_PATH}/${symbol.nameId}_${anomalyInterval}.svg`,
                scale: normalizedPropertyValue
            })
        });
    }

    /**
     * Function computes normalizedPropertyValue of specific feature
     * @param {CombinedSymbol} symbol - symbol
     * @returns {number} Normalized property value used for size of symbol
     */
    getNormalizedPropertyValue(symbol) {
        return Symbolizer.normalize(symbol.value, this.minMaxValues[symbol.nameId]['min'], this.minMaxValues[symbol.nameId]['max']);
    }

    /**
     * Creates array of OL styles objects based on CombinedSymbols
     * @returns {Style[]} styles - array of OL styles
     */
    createSymbol() {
        let styles = [];

        let primaryCombinedSymbol = featureInfo[this.feature.getId()].combinedSymbol.primarySymbol;
        if (primaryCombinedSymbol.nameId !== null) {
            let primaryNormalizedPropertyValue = this.getNormalizedPropertyValue(primaryCombinedSymbol);
            styles.push(this.buildStyle(primaryCombinedSymbol, primaryNormalizedPropertyValue));
        }

        let secondaryCombinedSymbol = featureInfo[this.feature.getId()].combinedSymbol.secondarySymbol;
        if (secondaryCombinedSymbol.nameId !== null) {
            let secondaryNormalizedPropertyValue = this.getNormalizedPropertyValue(secondaryCombinedSymbol);
            styles.push(this.buildStyle(secondaryCombinedSymbol, secondaryNormalizedPropertyValue));
        }

        let tertiaryCombinedSymbol = featureInfo[this.feature.getId()].combinedSymbol.tertiarySymbol;
        if (tertiaryCombinedSymbol.nameId !== null) {
            let tertiaryNormalizedPropertyValue = this.getNormalizedPropertyValue(tertiaryCombinedSymbol);
            styles.push(this.buildStyle(tertiaryCombinedSymbol, tertiaryNormalizedPropertyValue));
        }

        let otherSymbols = featureInfo[this.feature.getId()].combinedSymbol.otherSymbols;
        let counter = 0;
        for (let otherSymbol of otherSymbols) {
            // Symbolize VGI symbols inside other symbols
            if (otherSymbol.hasOwnProperty('phenomenon')) {
                counter += 1;
                styles = styles.concat(new VGISymbolizer(otherSymbol.vgiFeature, this.resolution, [1 - counter, 0]).createSymbol());
            } else if (otherSymbol.nameId !== null) {
                counter += 1;
                let otherNormalizedPropertyValue = this.getNormalizedPropertyValue(otherSymbol);
                styles.push(this.buildStyle(otherSymbol, otherNormalizedPropertyValue));
            }
        }

        return styles;
    }
}