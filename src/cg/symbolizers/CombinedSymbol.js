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
            grouped: false
        };
        this.secondarySymbol = {
            nameId: this.setSymbol(properties, feature),
            value: null,
            anomalyValue: null,
            grouped: false
        };
        this.tertiarySymbol = {
            nameId: this.setSymbol(properties, feature),
            value: null,
            anomalyValue: null,
            grouped: false
        };
        this.otherSymbols = this.setOtherSymbols(properties, feature);
        this.setPhenomenonValues(feature, valueIdx);

        this.buffer = null;
        this.setBuffer(feature, minMaxValues);
    }

    /**
     * Sets the values of specific symbols from feature values array
     * @param {Feature} feature - OpenLayer feature
     * @param {number} valueIdx - index of array where is value stored
     */
    setPhenomenonValues(feature, valueIdx) {
        this.primarySymbol.value = (this.primarySymbol.nameId !== null) ? feature.values_[this.primarySymbol.nameId].values[valueIdx] : null;
        this.secondarySymbol.value = (this.secondarySymbol.nameId !== null) ? feature.values_[this.secondarySymbol.nameId].values[valueIdx] : null;
        this.tertiarySymbol.value = (this.tertiarySymbol.nameId !== null) ? feature.values_[this.tertiarySymbol.nameId].values[valueIdx] : null;
        this.setOtherValues(feature, valueIdx);

        this.primarySymbol.anomalyValue = (this.primarySymbol.nameId !== null) ? feature.values_[this.primarySymbol.nameId].anomaly_rates[valueIdx] : null;
        this.secondarySymbol.anomalyValue = (this.secondarySymbol.nameId !== null) ? feature.values_[this.secondarySymbol.nameId].anomaly_rates[valueIdx] : null;
        this.tertiarySymbol.anomalyValue = (this.tertiarySymbol.nameId !== null) ? feature.values_[this.tertiarySymbol.nameId].anomaly_rates[valueIdx] : null;
        this.setOtherAnomalyValues(feature, valueIdx);
    }

    /**
     * Compares two combined symbols
     * @param {CombinedSymbol.symbol} symbol - primary, secondary, tertiary or other symbol
     * @param {CombinedSymbol.symbol} other - primary, secondary, tertiary or other symbol
     * @returns {CombinedSymbol.symbol}
     */
    static compareSymbols(symbol, other) {
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

            symbol.value = feature.values_[symbol.nameId].values[valueIdx];
            values.push(feature.values_[symbol.nameId].values[valueIdx]);
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
        return ((70 * scaleMaxValue) * Math.sqrt(2)) * this.resolution;
    }

    /**
     * Set the buffer of CombinedSymbol
     * @param {Feature} feature - OpenLayer feature
     * @param {Object[]} minMaxValues - object of minimum and maximum values
     */
    setBuffer(feature, minMaxValues) {
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
                        grouped: false
                    });
                } else {
                    this.usedProperties.push(property.name_id);
                    symbols.push({style: null, nameId: null, value: null, anomalyValue: null, grouped: false});
                }
            }
        }

        return symbols;
    }
}