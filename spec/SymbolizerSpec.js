import Symbolizer from '../src/cg/Symbolizer';
const geojson = require('../data/example.json');

describe('Symbolizer tests', function () {

    it('getMaxValue() spec', function () {
        expect(Symbolizer.getMaxValue(geojson, 'property_values')).toBe(17.967);
    });
});