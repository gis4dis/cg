//import Symbolizer from 'Symbolizer.js';
let Symbolizer = require('./Symbolizer.js').default;

export default ({property, features, value_idx, resolution}) => {

    //TODO add other assurance checks
    if (features === null) {
        return {
            features: [],
            style: null
        }
    }

    if (property.properties.length === 0) {
        throw new Error('There are not properties in property parameter');
    }

    let symbolizer = new Symbolizer(features);
    property.properties.forEach(function (value) {
       let style = Symbolizer.styleBasedOnProperty(value);
       symbolizer.addStyle(style);
    });

    console.log('Features');
    console.log(symbolizer.features);

    console.log('Styles');
    console.log(symbolizer.styles);

    return {
        features: symbolizer.features,
        style: symbolizer.styles
    };
}