import Style from 'ol/style/style';
import Icon from 'ol/style/icon';
import {featureInfo} from '../generalize';
import VGISymbolizer from './VGISymbolizer';


/* Constants of position of symbols */
const positions = {
    'PRIMARY': [1, 1],
    'SECONDARY': [0, 1],
    'TERTIARY': [1, 0],
    'OTHER': [0, 0]
};



const SYMBOL_PATH = '/static/symbolization_new2';

const MIN_RANGE = 0.3;
const MAX_RANGE = 0.5;


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
        this.grouped = false;
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
     * @param {CombinedSymbol} symbol - symbol
     * @returns {String} interval - interval (low, middle or high) of anomaly rate
     * */
    getAnomalyInterval(symbol) {
        if (symbol.anomalyValue > symbol.anomalyPercentile95) {
            return 'high';
        } else if (symbol.anomalyValue > symbol.anomalyPercentile80 && symbol.anomalyPercentile80 !== 0.0) {
            return 'middle';
        }
        return 'low';
    }

    static getCoeficient(normalizedPropertyValue) {
        return (0.5 - normalizedPropertyValue) * 1.5;
    }

    centerSymbols(propertyPosition, normalizedPropertyValue, counter) {
        let coeficient = Symbolizer.getCoeficient(normalizedPropertyValue);
        if (propertyPosition === 'PRIMARY') {
            return [positions[propertyPosition][0] + coeficient, positions[propertyPosition][1] + coeficient];
        } else if (propertyPosition === 'SECONDARY') {
            return [positions[propertyPosition][0] - coeficient, positions[propertyPosition][1] + coeficient];
        } else if (propertyPosition === 'TERTIARY') {
            return [positions[propertyPosition][0] + coeficient, positions[propertyPosition][1] - coeficient];
        } else if (propertyPosition === 'OTHER') {
            return [positions[propertyPosition][0] - counter - coeficient, positions[propertyPosition][1] - coeficient];
        } else {
            throw new Error(`Wrong property position parameter: ${propertyPosition}`);
        }
    }

    /**
     * Returns position of symbol based on property nameId
     * @param {String} nameId - name of the property (air_temperature...)
     * @returns {number[]} x and y coordinates in array
     */
    getSymbolPosition(nameId, normalizedPropertyValue, counter) {
        for (let property of this.properties) {
            if (property.name_id === nameId) {
                return this.centerSymbols(property.position, normalizedPropertyValue, counter);
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
    buildStyle(symbol, normalizedPropertyValue, counter) {
        let anomalyInterval = '';
        let coordinates = this.getSymbolPosition(symbol.nameId, normalizedPropertyValue, counter);

        anomalyInterval = this.getAnomalyInterval(symbol);

        if (symbol.grouped === true) {
            anomalyInterval += '_agg';
            this.grouped = true;
        }

        return new Style({
            image: new Icon({
                anchor: [coordinates[0], coordinates[1]],
                anchorXUnits: 'fraction',
                anchorYUnits: 'fraction',
                opacity: 1,
                src: `${SYMBOL_PATH}/${symbol.nameId}_${anomalyInterval}.svg`,
                scale: normalizedPropertyValue,
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

        let featureInfoElement = featureInfo[this.feature.getId()];
        if (featureInfoElement === undefined) {
            console.log('Error missing feature info for feature');
            console.log(this.feature);
            return null;
        }

        let primaryCombinedSymbol = featureInfo[this.feature.getId()].combinedSymbol.primarySymbol;
        if (primaryCombinedSymbol.nameId !== null) {
            let primaryNormalizedPropertyValue = this.getNormalizedPropertyValue(primaryCombinedSymbol);
            styles.push(this.buildStyle(primaryCombinedSymbol, primaryNormalizedPropertyValue, 0));
        }

        let secondaryCombinedSymbol = featureInfo[this.feature.getId()].combinedSymbol.secondarySymbol;
        if (secondaryCombinedSymbol.nameId !== null) {
            let secondaryNormalizedPropertyValue = this.getNormalizedPropertyValue(secondaryCombinedSymbol);
            styles.push(this.buildStyle(secondaryCombinedSymbol, secondaryNormalizedPropertyValue, 0));
        }

        let tertiaryCombinedSymbol = featureInfo[this.feature.getId()].combinedSymbol.tertiarySymbol;
        if (tertiaryCombinedSymbol.nameId !== null) {
            let tertiaryNormalizedPropertyValue = this.getNormalizedPropertyValue(tertiaryCombinedSymbol);
            styles.push(this.buildStyle(tertiaryCombinedSymbol, tertiaryNormalizedPropertyValue, 0));
        }

        let otherSymbols = featureInfo[this.feature.getId()].combinedSymbol.otherSymbols;
        let filteredSymbols = otherSymbols.filter(function(value, index, arr) {
            return value.nameId !== null;
        })
        let counter = (filteredSymbols.length - 1) * 0.5 * -1;
        let reversedOtherSymbols = filteredSymbols.slice().reverse();
        for (let otherSymbol of reversedOtherSymbols) {
            // Symbolize VGI symbols inside other symbols
            if (otherSymbol.hasOwnProperty('phenomenon')) {
                styles = styles.concat(new VGISymbolizer(otherSymbol.vgiFeature, this.resolution, [counter - Symbolizer.getCoeficient(0.4), 0 - Symbolizer.getCoeficient(0.4)]).createSymbol());
                counter += 0.5;
            } else if (otherSymbol.nameId !== null) {
                let otherNormalizedPropertyValue = this.getNormalizedPropertyValue(otherSymbol);
                styles.push(this.buildStyle(otherSymbol, otherNormalizedPropertyValue, counter));
                counter += 0.5;
            }
        }

        // place a cross of location if there is only one symbol
        if (styles.length === 1) {
            // don't place a cross for grouped symbols
            styles.push(
                new Style({
                    image: new Icon({
                        opacity: 1,
                        src: `${SYMBOL_PATH}/cross_position.svg`,
                        scale: 0.1
                    })
                })
            );
        }

        return styles;
    }
}
