import Style from 'ol/style/style';
import Icon from 'ol/style/icon';
import Stroke from 'ol/style/stroke';
import Fill from 'ol/style/fill';
import Symbolizer from './Symbolizer';
import {isServer} from '../helpers';

const SYMBOL_PATH = '/static/symbolization/vgi';

/** Represents Symbolizer for features. Contains set of operations including creating styles */
export default class PolygonSymbolizer {

    /**
     * Instantiating of Symbolizer object
     * @constructor
     * @param {Feature} feature - represented as one feature from an Array of GeoJSON Features, each of them includes attributes
     *  (https://github.com/gis4dis/cg/blob/master/data/vgi_data.json)
     */
    constructor(feature) {
        this.feature = feature;
    }

    /**
     * Builds OpenLayers style based on combinedSymbol and normalized property value
     * @returns {Style} OpenLayers style object
     */
    buildStyle() {
        return new Style({
            stroke: new Stroke({
                color: 'rgb(102, 51, 0)',
                width: 3
            }),
            fill: new Fill({
                color: 'rgba(204, 102, 0, 0.2)'
            })
        });
        if (isServer()) {
            return new Style({
                stroke: new Stroke({
                    color: 'rgb(102, 51, 0)',
                    width: 3
                }),
                fill: new Fill({
                    color: 'rgba(204, 102, 0, 0.2)'
                })
            });
        } else {
            // TODO set image based on aggregated VGI features
            let cnv = document.createElement('canvas');
            let ctx = cnv.getContext('2d');
            let img = new Image();
            img.src = `${SYMBOL_PATH}/vgi_drytree_pattern.svg`;
            let pattern = ctx.createPattern(img, 'repeat');

            return new Style({
                stroke: new Stroke({
                    color: 'rgb(102, 51, 0)',
                    width: 3
                }),
                fill: new Fill({
                    color: pattern
                })
            });
        }
    }

    /**
     * Creates array of OL styles objects based on CombinedSymbols
     * @returns {Style[]} styles - array of OL styles
     */
    createSymbol() {
        let styles = [];

        styles.push(this.buildStyle());

        return styles;
    }

    createDefaultSymbol() {
        return new Style({
            stroke: new Stroke({
                color: 'rgb(102, 51, 0)',
                width: 3
            }),
            fill: new Fill({
                color: 'rgba(204, 102, 0, 0.2)'
            })
        });
    }
}
