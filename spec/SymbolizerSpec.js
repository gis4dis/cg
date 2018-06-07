//import Symbolizer from "../src/cg/Symbolizer";
import Symbolizer from '../src/cg/Symbolizer';
import Style from "ol/style/style";
import Fill from "ol/style/fill";
import Stroke from "ol/style/stroke";

describe('Symbolizer tests', function () {

    it('', function () {
        //TODO check if I can use toEqual on style object
        expect(Symbolizer.buildStyle()).toEqual(new Style({
            fill: new Fill({
                color: 'rgba(255,255,255,0.4)'
            }),
            stroke: new Stroke({
                color: '#3399CC',
                width: 1.25
            }),
        }));
    });
});