import Symbolizer from "./Symbolizer";
import {featureInfo} from "../generalize";

let turfbuffer = require('@turf/buffer');

const AGGREGATE_RULE = 'max';


/** Represents combination of symbols */
export default class CombinedSymbol {
    /**
     * Instantiating of Combined symbol object - object contains 4 parts of combined symbol - left-top, left-bottom,
     * right-top, right-bottom.
     * @constructor
     * @param {String} primary_property - value selected by user
     *  (https://github.com/gis4dis/mc-client/blob/e7e4654dbd4f4b3fb468d4b4a21cadcb1fbbc0cf/static/data/properties.json)
     * @param {Object} properties - object of properties
     * @param {Feature} feature - represented as one feature from an Array of GeoJSON Features, each of them includes attributes
     *  (https://github.com/gis4dis/cg/blob/master/data/example.json)
     * @param {number} valueIdx - an index of value that should be used for generalization
     * @param {number} resolution - number, represents projection units per pixel (the projection is EPSG:3857)
     * @param {Object.<array>} minMaxValues - minimum and maximum values (min and max property values, min and max anomaly rates)
     *  (https://github.com/gis4dis/poster/wiki/Interface-between-MC-client-&-CG)
     */
    constructor(feature, properties, primary_property, resolution, valueIdx, minMaxValues) {
        this.primaryProperty = primary_property;
        this.usedProperties = [];
        this.resolution = resolution;

        this.primarySymbol = {
            nameId: this.setPrimarySymbol(feature),
            value: null,
            anomalyValue: null,
            grouped: false,
            anomalyPercentile80: null,
            anomalyPercentile95: null
        };
        this.secondarySymbol = {
            nameId: this.setSymbol(properties, feature),
            value: null,
            anomalyValue: null,
            grouped: false,
            anomalyPercentile80: null,
            anomalyPercentile95: null
        };
        this.tertiarySymbol = {
            nameId: this.setSymbol(properties, feature),
            value: null,
            anomalyValue: null,
            grouped: false,
            anomalyPercentile80: null,
            anomalyPercentile95: null
        };
        this.otherSymbols = this.setOtherSymbols(properties, feature);
        this.setPhenomenonValues(feature, valueIdx);

        this.buffer = null;
        this.setBuffer(feature, minMaxValues);
    }

    /**
     * Returns percentile value
     * @param {String} nameId - name of the property
     * @param {Feature} feature - OpenLayer feature
     * @param {String} type - type of the value (value or anomaly_rate)
     * @param {String} percentile - percentile
     * @returns {Number} - percentile value
     */
    static selectPercentileValue(nameId, feature, type, percentile) {
        if (nameId !== null) {
            let value = feature.values_[nameId][type][percentile];

            if (value === undefined) {
                return null
            }
            return value;
        }
        return null;
    }

    /**
     * Returns value on specific index moved by shift index
     * @param {String} nameId - name of the property
     * @param {Feature} feature - OpenLayer feature
     * @param {Number} valueIdx - index
     * @param {String} type - type of the value (value or anomaly_rate)
     * @returns {Number} - value on specific index or null if there are not value
     */
    static selectValue(nameId, feature, valueIdx, type) {
        if (nameId !== null) {
            let shift =  feature.values_[nameId].value_index_shift;
            let value = feature.values_[nameId][type][valueIdx + shift];

            if (value === undefined) {
                return null
            }
            return value;
        }
        return null;
    }

    /**
     * Sets the values of specific symbols from feature values array
     * @param {Feature} feature - OpenLayer feature
     * @param {number} valueIdx - index of array where is value stored
     */
    setPhenomenonValues(feature, valueIdx) {
        // set property values
        this.primarySymbol.value = CombinedSymbol.selectValue(this.primarySymbol.nameId, feature, valueIdx, 'values');
        this.secondarySymbol.value = CombinedSymbol.selectValue(this.secondarySymbol.nameId, feature, valueIdx, 'values');
        this.tertiarySymbol.value = CombinedSymbol.selectValue(this.tertiarySymbol.nameId, feature, valueIdx, 'values');
        this.setOtherValues(feature, valueIdx);

        // set anomaly values
        this.primarySymbol.anomalyValue = CombinedSymbol.selectValue(this.primarySymbol.nameId, feature, valueIdx, 'anomaly_rates');
        this.secondarySymbol.anomalyValue = CombinedSymbol.selectValue(this.secondarySymbol.nameId, feature, valueIdx, 'anomaly_rates');
        this.tertiarySymbol.anomalyValue = CombinedSymbol.selectValue(this.tertiarySymbol.nameId, feature, valueIdx, 'anomaly_rates');
        this.setOtherAnomalyValues(feature, valueIdx);

        // set anomaly percentile values
        this.primarySymbol.anomalyPercentile80 = CombinedSymbol.selectPercentileValue(this.primarySymbol.nameId, feature, 'property_anomaly_percentiles', '80');
        this.primarySymbol.anomalyPercentile95 = CombinedSymbol.selectPercentileValue(this.primarySymbol.nameId, feature, 'property_anomaly_percentiles', '95');

        this.secondarySymbol.anomalyPercentile80 = CombinedSymbol.selectPercentileValue(this.secondarySymbol.nameId, feature, 'property_anomaly_percentiles', '80');
        this.secondarySymbol.anomalyPercentile95 = CombinedSymbol.selectPercentileValue(this.secondarySymbol.nameId, feature, 'property_anomaly_percentiles', '95');

        this.tertiarySymbol.anomalyPercentile80 = CombinedSymbol.selectPercentileValue(this.tertiarySymbol.nameId, feature, 'property_anomaly_percentiles', '80');
        this.tertiarySymbol.anomalyPercentile95 = CombinedSymbol.selectPercentileValue(this.tertiarySymbol.nameId, feature, 'property_anomaly_percentiles', '95');

        this.setOtherAnomalyPercentileValues(feature);
    }

    /**
     * Compares two combined symbols
     * @param {CombinedSymbol.symbol} symbol - primary, secondary, tertiary or other symbol
     * @param {CombinedSymbol.symbol} other - primary, secondary, tertiary or other symbol
     * @returns {CombinedSymbol.symbol}
     */
    static compareSymbols(symbol, other) {
        if (symbol.nameId === null && other.nameId !== null) {
            other.grouped = false;
            return other;
        }

        if (symbol.nameId !== null && other.nameId === null) {
            symbol.grouped = false;
            return symbol;
        }

        if (symbol.anomalyValue < other.anomalyValue) {
            if (symbol.nameId !== null && other.nameId !== null) {
                other.grouped = true;
            }
            return other;
        }
        if (symbol.nameId !== null && other.nameId !== null) {
            symbol.grouped = true;
        }
        return symbol;
    }

    /**
     * Aggregates symbols inside CombinedSymbol object
     * @param {CombinedSymbol.symbol} other - primary, secondary, tertiary or other symbol
     */
    aggregateSymbols(other) {
        this.primarySymbol = CombinedSymbol.compareSymbols(this.primarySymbol, other.primarySymbol);
        this.secondarySymbol = CombinedSymbol.compareSymbols(this.secondarySymbol, other.secondarySymbol);
        this.tertiarySymbol = CombinedSymbol.compareSymbols(this.tertiarySymbol, other.tertiarySymbol);

        for (let i in this.otherSymbols) {
            this.otherSymbols[i] = CombinedSymbol.compareSymbols(this.otherSymbols[i], other.otherSymbols[i]);
        }
    }

    /**
     * Sets anomaly values for other symbols inside CombinedSymbol
     * @param {Feature} feature - OpenLayer feature
     * @param {number} valueIdx - index of array where is value stored
     * @returns {number[]} - returns array of values
     */
    setOtherAnomalyPercentileValues(feature) {
        let values = [];

        for (let symbol of this.otherSymbols) {
            if (symbol.nameId === null) {
                continue;
            }

            symbol.anomalyPercentile80 = feature.values_[symbol.nameId]['property_anomaly_percentiles'][80];
            symbol.anomalyPercentile95 = feature.values_[symbol.nameId]['property_anomaly_percentiles'][95];
            values.push(symbol.anomalyPercentile80, symbol.anomalyPercentile95);
        }
        return values;
    }

    /**
     * Sets anomaly values for other symbols inside CombinedSymbol
     * @param {Feature} feature - OpenLayer feature
     * @param {number} valueIdx - index of array where is value stored
     * @returns {number[]} - returns array of values
     */
    setOtherAnomalyValues(feature, valueIdx) {
        let values = [];

        for (let symbol of this.otherSymbols) {
            if (symbol.nameId === null) {
                continue;
            }

            symbol.anomalyValue = CombinedSymbol.selectValue(symbol.nameId, feature, valueIdx, 'anomaly_rates');
            values.push(symbol.anomalyValue);
        }
        return values;
    }

    /**
     * Sets values for other symbols inside CombinedSymbol
     * @param {Feature} feature - OpenLayer feature
     * @param {number} valueIdx - index of array where is value stored
     * @returns {number[]} - returns array of values
     */
    setOtherValues(feature, valueIdx) {
        let values = [];

        for (let symbol of this.otherSymbols) {
            if (symbol.nameId === null) {
                continue;
            }

            symbol.value = CombinedSymbol.selectValue(symbol.nameId, feature, valueIdx, 'values');
            values.push(symbol.value);
        }
        return values;
    }

    /**
     * Returns values of CombinedSymbol.otherSymbol as an array
     * @returns {number[]} - array of values of CombinedSymbol.otherSymbols
     */
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

    /**
     * Computes radius
     * @param {number} scaleMaxValue - value of scale (value of biggest symbol inside CombinedSymbol)
     * @returns {number} - radius
     */
    computeRadius(scaleMaxValue) {
        return ((105 * scaleMaxValue) * Math.sqrt(2)) * this.resolution;
    }

    static getMinProperty(minMaxValues) {
        let minValue = minMaxValues.reduce((min, p) => p.min < min ? p.min : min, minMaxValues[0].min);
        if (minValue === null) {
            return 0;
        }
        return minValue;
    }

    static getMaxProperty(minMaxValues) {
        let maxValue = minMaxValues.reduce((max, p) => p.max > max ? p.max : max, minMaxValues[0].max);
        if (maxValue === null) {
            return 0;
        }
        return maxValue;
    }

    /**
     * Set the buffer of CombinedSymbol
     * @param {Feature} feature - OpenLayer feature
     * @param {Object[]} minMaxValues - object of minimum and maximum values
     */
    setBuffer(feature, minMaxValues) {
        let other = this.getOtherValues();

        other.push(this.primarySymbol.value, this.secondarySymbol.value, this.tertiarySymbol.value);

        let radius = this.computeRadius(0.3);

        this.buffer = turfbuffer.default(featureInfo[feature.getId()].turfGeometry, radius, {units: 'meters'});

    }

    /**
     * Sets the primary symbol of CombinedSymbol
     * @param {Feature} feature - OpenLayer feature
     * @returns {*}
     */
    setPrimarySymbol(feature) {
        if (feature.values_.hasOwnProperty(this.primaryProperty)) {
            this.usedProperties.push(this.primaryProperty);
            return this.primaryProperty;
        }
        return null;
    }

    /**
     * Sets other nonprimary symbols
     * @param {Object[]} properties - Object with properties
     * @param {Feature} feature - OpenLayer feature
     * @returns {*}
     */
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

    /**
     * Sets other symbols
     * @param {Object[]} properties - Object with properties
     * @param {Feature} feature - OpenLayer feature
     * @returns {Array} - array of other symbols
     */
    setOtherSymbols(properties, feature) {
        let symbols = [];

        for (let property of properties) {
            if (property.name_id !== this.primaryProperty) {
                if (this.usedProperties.includes(property.name_id)) {
                    continue;
                }
                if (feature.values_.hasOwnProperty(property.name_id)) {
                    this.usedProperties.push(property.name_id);
                    symbols.push({
                        style: null,
                        nameId: property.name_id,
                        value: null,
                        anomalyValue: null,
                        grouped: false,
                        anomalyPercentile80: null,
                        anomalyPercentile95: null
                    });
                } else {
                    this.usedProperties.push(property.name_id);
                    symbols.push({
                        style: null,
                        nameId: null,
                        value: null,
                        anomalyValue: null,
                        grouped: false,
                        anomalyPercentile80: null,
                        anomalyPercentile95: null
                    });
                }
            }
        }

        return symbols;
    }

    addVgiToOtherSymbols(vgiFeature) {
        let phenomenon = vgiFeature.values_.values[0].phenomenon.name;
        this.otherSymbols.push({
            style: null,
            phenomenon: phenomenon,
            vgiFeature: vgiFeature,
            values: vgiFeature.values_.values,
            grouped: false
        });
    }
}
