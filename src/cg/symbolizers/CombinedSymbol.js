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
        //console.log(JSON.stringify(this.usedProperties));
        this.resolution = resolution;

        this.primarySymbol = {style: null, nameId: this.setPrimarySymbol(feature), value: null, anomalyValue: null, grouped: false};
        this.secondarySymbol = {style: null, nameId: this.setSymbol(properties, feature), value: null, anomalyValue: null, grouped: false};
        this.tertiarySymbol = {style: null, nameId: this.setSymbol(properties, feature), value: null, anomalyValue: null, grouped: false};
        this.otherSymbols = this.setOtherSymbols(properties, feature);
        this.setPhenomenonValues(feature, value_idx);

        this.buffer = null;
        this.setBuffer(feature, value_idx, minMaxValues);
        //console.log(this.buffer);
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
        console.log('COMPARE');
        console.log(symbol);
        console.log(other);
        if (symbol.anomalyValue < other.anomalyValue) {
            if (symbol.nameId !== null && other.nameId !== null) {other.grouped = true;}
            return other;
        }
        if (symbol.nameId !== null && other.nameId !== null) {symbol.grouped = true;}
        return symbol;
    }

    //TODO add the same thing for anomalyRates
    aggregateSymbols(other) {
        //console.log('OTHER');
        //console.log(this);
        //console.log(other);
        //console.log(CombinedSymbol.compareValues(this.primarySymbol, other.primarySymbol));
        //console.log(this.primarySymbol.value);
        this.primarySymbol = CombinedSymbol.compareValues(this.primarySymbol, other.primarySymbol);
        //console.log(JSON.stringify(this.primarySymbol.value));
        //console.log('AFTER PRIMARY');
        //console.log(this);

        this.secondarySymbol = CombinedSymbol.compareValues(this.secondarySymbol, other.secondarySymbol);
        //console.log('TERTIARY');
        //console.log(CombinedSymbol.compareValues(this.tertiarySymbol, other.tertiarySymbol));
        this.tertiarySymbol = CombinedSymbol.compareValues(this.tertiarySymbol, other.tertiarySymbol);

        for (let i in this.otherSymbols) {
            this.otherSymbols[i] = CombinedSymbol.compareValues(this.otherSymbols[i], other.otherSymbols[i]);
        }
        //console.log(JSON.stringify(this));
    }

    setOtherAnomalyValues(feature, valueIdx) {
        let values = [];

        for (let symbol of this.otherSymbols) {
            //console.log('SET OTHER VALUES');
            //console.log(symbol);
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
            //console.log('SET OTHER VALUES');
            //console.log(symbol);
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
            //console.log('GET OTHER VALUES');
            //console.log(symbol);
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
        //console.log('BUFFER');
        //console.log(JSON.stringify(this));
        let other = this.getOtherValues();
        //console.log('BUFFER WITH VALUES');
        //console.log(JSON.stringify(this));

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
        //console.log('BEFORE SYMBOL');
        //console.log(JSON.stringify(this.usedProperties));
        for (let property of properties) {
            if (property.name_id !== this.primaryProperty) {
                //console.log(property.name_id);
                if (this.usedProperties.includes(property.name_id)) {
                    continue;
                }
                if (feature.values_.hasOwnProperty(property.name_id)) {
                    this.usedProperties.push(property.name_id);
                    //console.log('VRACIM IF');
                    return property.name_id;
                } else {
                    this.usedProperties.push(property.name_id);
                    //console.log('VRACIM NULL');
                    return null;
                }
            }
        }
    }

    setOtherSymbols(properties, feature) {
        let symbols = [];

        for (let property of properties) {
            if (property.name_id !== this.primaryProperty) {
                //console.log('PROPERTY NAME ID');
                //console.log(property.name_id);
                //console.log(JSON.stringify(this.usedProperties));
                if (this.usedProperties.includes(property.name_id)) {
                    continue;
                }
                if (feature.values_.hasOwnProperty(property.name_id)) {
                    this.usedProperties.push(property.name_id);
                    symbols.push({style: null, nameId: property.name_id, value: null, anomalyValue: null, grouped: false});
                } else {
                    this.usedProperties.push(property.name_id);
                    symbols.push({style: null, nameId: null, value: null, anomalyValue: null, grouped: false});
                }
            }
        }

        return symbols;
    }
}