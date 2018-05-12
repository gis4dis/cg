require('babel-register')({
  "only": [
      "/src/",
      "/node_modules/ol/",
  ],
  "presets": ["es2015"]
});

const printFeatures = require('./../src/cg/print-features').default;
printFeatures();