import Symbolizer from '../src/cg/symbolizers/Symbolizer';
import GeoJSON from "ol/format/geojson";

const geojson = require('../data/example.json');
import generalize from './../src/cg/generalize';

describe('Generalize function tests', function () {

    it('generalize() spec', function () {
        expect(function () {generalize({
            topic: {
                "name": "drought",
                "name_id": "drought"
            },
            properties: [
                {
                    "name_id":"air_temperature",
                    "name":"air temperature",
                    "unit":"°C"
                },
                {
                    "name_id":"ground_air_temperature",
                    "name":"ground air temperature",
                    "unit":"°C"
                }
            ],
            primary_property: null,
            features: geojson,
            value_idx: 1,
            resolution: 76.43702828517625
        })}).toThrow(new Error('Property not provided'));

        expect(function () {generalize({
            property: {
                "name_id": "air_temperature",
                "name": "air temperature",
                "unit": "°C"
            },
            features: geojson,
            value_idx: 1,
            resolution: null
        })}).toThrow(new Error('Resolution not provided'));

        expect(function () {generalize({
            property: {
                "name_id": "air_temperature",
                "name": "air temperature",
                "unit": "°C"
            },
            features: geojson,
            value_idx: -1,
            resolution: 76.43702828517625
        })}).toThrow(new Error('Value_idx values must be >= 0'));
    });

    it('generalize() spec', function () {
        expect(generalize({
            property: {
                "name_id": "air_temperature",
                "name": "air temperature",
                "unit": "°C"
            },
            features: null,
            value_idx: 1,
            resolution: 76.43702828517625
        })).toEqual(jasmine.objectContaining({
            features: [],
            style: null
        }));
    });
});