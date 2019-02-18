import Style from 'ol/style/style';
import Icon from 'ol/style/icon';
import Symbolizer from "./Symbolizer";
let turfbuffer = require('@turf/buffer');

/* Constants of position of symbols. Default value by OL is [0.5, 0.5] */
/*const positions = {
    'PRIMARY': [1,1],
    'SECONDARY': [0,0],
    'TERTIARY': [1,0],
    'OTHER': [0,1]
};

const SYMBOL_PATH = '/static/symbolization';

const MIN_RANGE = 0.2;
const MAX_RANGE = 0.6;*/

const AGGREGATE_RULE = 'max';


/** Represents Symbolizer for features. Contains set of operations including creating styles */
export default class CombinedSymbol {

    /**
     * Instantiating of Combined symbol object - object contains 4 parts of combined symbol - left-top, left-bottom,
     * right-top, right-bottom.
     * @constructor
     * @param {Object} primarySymbol - primary left-top symbol - primary property chosen by user
     * @param {Object} secondarySymbol - secondary left-bottom symbol - secondary property (random position)
     * @param {Object} tertiarySymbol - tertiary right-top symbol - tertiary property (random position)
     * @param {Object.<array>} otherSymbols - other right-bottom symbols - array of other symbols
     */
    constructor(feature, properties, primary_property,resolution, value_idx, minMaxValues) {
        this.primaryProperty = primary_property;
        this.feature = feature;
        this.usedProperties = [];
        this.resolution = resolution;

        this.primarySymbol = {style: null, nameId: this.setPrimarySymbol(), value: null};
        this.secondarySymbol = {style: null, nameId: this.setSymbol(properties), value: null};
        this.tertiarySymbol = {style: null, nameId: this.setSymbol(properties), value: null};
        this.otherSymbols = this.setOtherSymbols(properties);

        this.buffer = null;
        this.setBuffer(value_idx, minMaxValues);
        //console.log(this.buffer);
    }

    static compareValues(value, other) {
        if (value < other) {
            return other;
        }
        return value;
    }

    //TODO add the same thing for anomalyRates
    aggregateSymbols(other) {
        console.log('OTHER');
        console.log(other);
        this.primarySymbol.value = CombinedSymbol.compareValues(this.primarySymbol.value, other.primarySymbol.value);
        this.secondarySymbol.value = CombinedSymbol.compareValues(this.secondarySymbol.value, other.secondarySymbol.value);
        this.tertiarySymbol.value = CombinedSymbol.compareValues(this.tertiarySymbol.value, other.tertiarySymbol.value);

        for (let i in this.otherSymbols) {
            this.otherSymbols[i].value = CombinedSymbol.compareValues(other.otherSymbols[i]);
        }
    }

    getOtherValues(valueIdx) {
        let values = [];

        for (let symbol of this.otherSymbols) {
            symbol.value = this.feature.values_[symbol.nameId].values[valueIdx];
            values.push(this.feature.values_[symbol.nameId].values[valueIdx]);
        }
        return values;
    }

    computeRadius(scaleMaxValue) {
        return ((70 * scaleMaxValue) * Math.sqrt(2)) * this.resolution;
    }

    setBuffer(value_idx, minMaxValues) {
        this.primarySymbol.value = (this.primarySymbol.nameId !== null) ? this.feature.values_[this.primarySymbol.nameId].values[value_idx] : null;
        this.secondarySymbol.value = (this.secondarySymbol.nameId !== null) ? this.feature.values_[this.secondarySymbol.nameId].values[value_idx] : null;
        this.tertiarySymbol.value = (this.tertiarySymbol.nameId !== null) ? this.feature.values_[this.tertiarySymbol.nameId].values[value_idx] : null;
        let other = this.getOtherValues(value_idx);

        other.push(this.primarySymbol.value, this.secondarySymbol.value, this.tertiarySymbol.value);
        let maxValue = Math.max(...other);

        //TODO not should be this.primary but it should be name_id of biggest value property
        let scaleMaxValue = Symbolizer.normalize(
            maxValue,
            minMaxValues[this.primaryProperty]['min'],
            minMaxValues[this.primaryProperty]['max']
        );

        let radius = this.computeRadius(scaleMaxValue);

        this.buffer = turfbuffer.default(this.feature.values_.turfGeometry, radius, {units: 'meters'});

    }

    setPrimarySymbol() {
        if (this.feature.values_.hasOwnProperty(this.primaryProperty)) {
            this.usedProperties.push(this.primaryProperty);
            return this.primaryProperty;
        }
        return null;
    }

    setSymbol(properties) {
        for (let property of properties) {
            if (property.name_id !== this.primaryProperty) {
                if (this.feature.values_.hasOwnProperty(property.name_id)) {
                    if (!this.usedProperties.includes(property.name_id)) {
                        this.usedProperties.push(property.name_id);
                        return property.name_id;
                    }
                } else {
                    this.usedProperties.push(property.name_id);
                    return null;
                }
            }
        }
    }

    setOtherSymbols(properties) {
        let symbols = [];

        for (let property of properties) {
            if (property.name_id !== this.primaryProperty) {
                console.log('PROPERTY NAME ID');
                console.log(property.name_id);
                console.log(this.usedProperties);
                if (this.feature.values_.hasOwnProperty(property.name_id)) {
                    if (!this.usedProperties.includes(property.name_id)) {
                        this.usedProperties.push(property.name_id);
                        symbols.push({style: null, nameId: property.name_id, value: null});
                    }
                }
            }
        }

        return symbols;
    }
}