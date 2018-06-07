import ol_format_GeoJSON from "ol/format/geojson";

let Symbolizer = require('./Symbolizer.js').default;
//let Cluster = require('./Cluster.js').default;

export default ({property, features, value_idx, resolution}) => {

    //TODO add other assurance checks
    if (features === null) {
        return {
            features: [],
            style: null
        }
    }

    if (property === null) {
        throw new Error('Property not provided');
    }

    //let cluster = new Cluster(features);


    // let geoms = (new ol_format_GeoJSON()).readFeatures(features, {
    //     dataProjection: 'EPSG:4326',
    //     featureProjection: 'EPSG:3857',
    // });

    //geoms.forEach(function(geom) {
        let symbolizer = new Symbolizer(features, value_idx);
        let style = Symbolizer.styleBasedOnProperty(property);
        symbolizer.addStyle(style);

    //});

    console.log(symbolizer.styles);
    return {
        features: symbolizer.features,
        styles: Symbolizer.styleBasedOnProperty(property),
    };
}