# cg
Cartographic generalization


## Requirements
- Node.js 9+


## Installation
```bash
git clone https://github.com/gis4dis/cg.git
cd cg
npm install
```

## Run
### OpenLayers in the browser
```bash
npm run dev
# open localhost:3000
```bash

### OpenLayers in Node.JS
```bash
node task/ol-node.js
```

### Run Jasmine Specs
```bash
node spec/run
```
## Repository Structure

```
/build          NextJS build directory
/components     NextJS components
/data           any data for testing
/pages          NextJS pages
/src            gis4dis CG subsystem (ES6 modules should be used)
/static         NextJS static content
/task           Node.JS commands (ES6 modules should not be used)
```