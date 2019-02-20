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
        this.usedProperties = [];
        this.resolution = resolution;

        this.primarySymbol = {style: null, nameId: this.setPrimarySymbol(feature), value: null, anomalyValue: null};
        this.secondarySymbol = {style: null, nameId: this.setSymbol(properties, feature), value: null, anomalyValue: null};
        this.tertiarySymbol = {style: null, nameId: this.setSymbol(properties, feature), value: null, anomalyValue: null};
        this.otherSymbols = this.setOtherSymbols(properties, feature);
        this.setPhenomenonValues(feature, value_idx);

        this.buffer = null;
        this.setBuffer(feature, value_idx, minMaxValues);
    }

    setPhenomenonValues(feature, value_idx) {
        this.primarySymbol.value = (this.primarySymbol.nameId !== null) ? feature.values_[this.primarySymbol.nameId].values[value_idx] : null;
        this.secondarySymbol.value = (this.secondarySymbol.nameId !== null) ? feature.values_[this.secondarySymbol.nameId].values[value_idx] : null;
        this.tertiarySymbol.value = (this.tertiarySymbol.nameId !== null) ? feature.values_[this.tertiarySymbol.nameId].values[value_idx] : null;
        this.setOtherValues(feature, value_idx);

        this.primarySymbol.anomalyValue = (this.primarySymbol.nameId !== null) ? feature.values_[this.primarySymbol.nameId].anomaly_rates[value_idx] : null;
        this.secondarySymbol.anomalyValue = (this.secondarySymbol.nameId !== null) ? feature.values_[this.secondarySymbol.nameId].anomaly_rates[value_idx] : null;
        this.tertiarySymbol.anomalyValue = (this.tertiarySymbol.nameId !== null) ? feature.values_[this.tertiarySymbol.nameId].anomaly_rates[value_idx] : null;
        this.setOtherAnomalyValues(feature, value_idx);
    }

    static compareValues(symbol, other) {
        if (symbol.anomalyValue < other.anomalyValue) {
            return other;
        }
        return symbol;
    }

    //TODO add the same thing for anomalyRates
    aggregateSymbols(other) {
        this.primarySymbol = CombinedSymbol.compareValues(this.primarySymbol, other.primarySymbol);
        this.secondarySymbol = CombinedSymbol.compareValues(this.secondarySymbol, other.secondarySymbol);
        this.tertiarySymbol = CombinedSymbol.compareValues(this.tertiarySymbol, other.tertiarySymbol);

        for (let i in this.otherSymbols) {
            this.otherSymbols[i] = CombinedSymbol.compareValues(this.otherSymbols[i], other.otherSymbols[i]);
        }
    }

    setOtherAnomalyValues(feature, valueIdx) {
        let values = [];

        for (let symbol of this.otherSymbols) {
            if (symbol.nameId === null) {
                continue;
            }

            symbol.anomalyValue = feature.values_[symbol.nameId].anomaly_rates[valueIdx];
            values.push(feature.values_[symbol.nameId].anomaly_rates[valueIdx]);
        }
        return values;
    }

    setOtherValues(feature, valueIdx) {
        let values = [];

        for (let symbol of this.otherSymbols) {
            if (symbol.nameId === null) {
                continue;
            }

            symbol.value = feature.values_[symbol.nameId].values[valueIdx];
            values.push(feature.values_[symbol.nameId].values[valueIdx]);
        }
        return values;
    }

    getOtherValues() {
        let values = [];

        for (let symbol of this.otherSymbols) {
            if (symbol.nameId === null) {
                continue;
            }

            values.push(symbol.value);
        }
        return values;
    }

    computeRadius(scaleMaxValue) {
        return ((70 * scaleMaxValue) * Math.sqrt(2)) * this.resolution;
    }

    setBuffer(feature, value_idx, minMaxValues) {
        let other = this.getOtherValues();

        other.push(this.primarySymbol.value, this.secondarySymbol.value, this.tertiarySymbol.value);
        let maxValue = Math.max(...other);

        //TODO not should be this.primary but it should be name_id of biggest value property
        let scaleMaxValue = Symbolizer.normalize(
            maxValue,
            minMaxValues[this.primaryProperty]['min'],
            minMaxValues[this.primaryProperty]['max']
        );

        let radius = this.computeRadius(scaleMaxValue);

        this.buffer = turfbuffer.default(feature.values_.turfGeometry, radius, {units: 'meters'});

    }

    setPrimarySymbol(feature) {
        if (feature.values_.hasOwnProperty(this.primaryProperty)) {
            this.usedProperties.push(this.primaryProperty);
            return this.primaryProperty;
        }
        return null;
    }

    setSymbol(properties, feature) {
        for (let property of properties) {
            if (property.name_id !== this.primaryProperty) {
                if (this.usedProperties.includes(property.name_id)) {
                    continue;
                }
                if (feature.values_.hasOwnProperty(property.name_id)) {
                    this.usedProperties.push(property.name_id);
                    return property.name_id;
                } else {
                    this.usedProperties.push(property.name_id);
                    return null;
                }
            }
        }
    }

    setOtherSymbols(properties, feature) {
        let symbols = [];

        for (let property of properties) {
            if (property.name_id !== this.primaryProperty) {
                if (this.usedProperties.includes(property.name_id)) {
                    continue;
                }
                if (feature.values_.hasOwnProperty(property.name_id)) {
                    this.usedProperties.push(property.name_id);
                    symbols.push({style: null, nameId: property.name_id, value: null, anomalyValue: null});
                } else {
                    this.usedProperties.push(property.name_id);
                    symbols.push({style: null, nameId: null, value: null, anomalyValue: null});
                }
            }
        }

        return symbols;
    }
}