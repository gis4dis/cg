require('babel-register')({
  "only": [
      "/src/",
      "/node_modules/ol/",
  ],
  "presets": ["es2015"]
});

//import Symbolizer from "../src/cg/Symbolizer";
let Symbolizer = require('../src/cg/Symbolizer').default;
let Style = require("ol/style/style").default;
let Fill = require("ol/style/fill").default;
let Stroke = require("ol/style/stroke").default;

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