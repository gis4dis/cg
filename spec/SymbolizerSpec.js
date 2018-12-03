import Symbolizer from '../src/cg/symbolizers/Symbolizer';
import GeoJSON from "ol/format/geojson";
const geojson = require('../data/example.json');

describe('Symbolizer tests', function() {

    function prepareObject() {
        let features = new GeoJSON().readFeatures(geojson, {
            dataProjection: 'EPSG:4326',
            featureProjection: 'EPSG:3857',
        });

        return new Symbolizer("air_temperature", [
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
            features[0],
            1, 76.43702828517625, {}, false);
    }

    it('normalize() spec', function() {
        expect(Symbolizer.normalize(4.35, 0.033, 17.967)).toBe(0.24071595851455335);
    });

    it('Anomaly color spec', function() {
        expect(Symbolizer.getAnomalyColor(1.2)).toBe('rgb(0, 153, 51)');
    });

    it('createSVG() spec', function() {
        let symbolizer = prepareObject();

        expect(symbolizer.createSVG('air_temperature', 90, 30)).toBe(
            `<svg width="180" height="180" version="1.1" xmlns="http://www.w3.org/2000/svg"><circle cx="90" cy="30" stroke="black" style="fill:rgb(255, 0, 0);stroke-width: 1" r="25.02293448435927"/></svg>`);
    });

    /*it('buildSVGSymbol() spec', function() {
        let symbolizer = prepareObject();

        spyOn(symbolizer.buildSVGSymbol(), 'buildSVGSymbol');

        symbolizer.buildSVGSymbol();
        expect(symbolizer.createSVG).toHaveBeenCalled();
    });*/

});