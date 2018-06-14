import Symbolizer from '../src/cg/Symbolizer';
import GeoJSON from "ol/format/geojson";
const geojson = require('../data/example.json');

describe('Symbolizer tests', function () {

    it('getMaxValue() spec', function () {
        expect(Symbolizer.getMaxValue(geojson, 'property_values')).toBe(17.967);
    });

    it('getMinValue() spec', function () {
        expect(Symbolizer.getMinValue(geojson, 'property_values')).toBe(0.033);
    });

    it('normalize() spec', function () {
        expect(Symbolizer.normalize(4.35, 0.033, 17.967)).toBe(0.24071595851455335);
    });

    it('createSVG() spec', function () {
        let features = new GeoJSON().readFeatures(geojson, {
            dataProjection: 'EPSG:4326',
            featureProjection: 'EPSG:3857',
        });
        let symbolizer = new Symbolizer({
                "name_id": "air_temperature",
                "name": "air temperature",
                "unit": "°C"
            }, features[0], 1, 76.43702828517625, 17.967, 0.033, 17.967, 0.033);

        expect(symbolizer.createSVG()).toBe('<svg width="65.28740565703525" height="150" version="1.1" xmlns="http://www.w3.org/2000/svg">' +
            '<rect x="0" y="125.92840414854467" width="32.643702828517625" height="31.71529867997296" style="fill:rgb(0,0,255);stroke-width:0" />' +
            '<rect x="32.643702828517625" y="125.92840414854467" width="32.643702828517625" height="31.71529867997296" style="fill:rgb(255,0,0);stroke-width:0" />' +
            '</svg>');
    });
});