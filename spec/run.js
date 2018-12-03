require('babel-register')({
  "only": [
      "/src/",
      "/spec/",
      "/node_modules/ol/",
  ],
  "presets": ["es2015"]
});

const Jasmine = require('jasmine');

const jasmine = new Jasmine();
jasmine.loadConfigFile('spec/support/jasmine.json');
jasmine.execute();