import Style from 'ol/style/style';
import Icon from 'ol/style/icon';
import {featureInfo} from '../generalize';


const SYMBOL_PATH = '/static/symbolization/vgi';
const SYMBOL_SIZE = 0.25;

const ICONS = [
        {phenomenonName: 'Dry vegetation (trees)', iconName: 'vgi_drytree'},
        {phenomenonName: 'Absence of mushrooms', iconName: 'vgi_mushroom'}
    ];


/** Represents Symbolizer for features. Contains set of operations including creating styles */
export default class VGISymbolizer {

    /**
     * Instantiating of Symbolizer object
     * @constructor
     * @param {Feature} feature - represented as one feature from an Array of GeoJSON Features, each of them includes attributes
     * @param {number} resolution - resolution of OpenLayer map
     *  (https://github.com/gis4dis/cg/blob/master/data/vgi_data.json)
     */
    constructor(feature, resolution, anchor) {
        this.anchor = anchor;
        this.feature = feature;
        this.resolution = resolution;
    }

    /**
     * Returning icon based on phenomenonName
     * @returns {string} Name of the VGI icon
     */
    getIconName() {
        let phenomenonName = this.feature.values_.values[0].phenomenon.name;
        for (let icon of ICONS) {
            if (icon.phenomenonName === phenomenonName) {
                return icon.iconName;
            }
        }
        return null;
    }

    /**
     * Builds OpenLayers style based on combinedSymbol and normalized property value
     * @returns {Style} OpenLayers style object
     */
    buildStyle() {
        let iconName = this.getIconName();
        if (!iconName) {
            throw new Error('Missing iconName. Please check if ICONS constant has right phenomenonName and iconName');
        }
        let icon = new Style({
            image: new Icon({
                anchor: this.anchor, //default is [0.5, 0.5]
                opacity: 1,
                src: `${SYMBOL_PATH}/${iconName}.svg`,
                scale: SYMBOL_SIZE
            })
        });

        let oneOrMoreCrossreferences = featureInfo[this.feature.getId()].crossReference;

        let anchor = [this.anchor[0] - 0.5, this.anchor[1] + 0.4];
        if (oneOrMoreCrossreferences === 'more') {
            anchor = [anchor[0] - 0.3, anchor[1] + 0.1];
        }
        let crossReferenceIcon = new Style({
            image: new Icon({
                anchor: anchor,
                opacity: 1,
                src: `${SYMBOL_PATH}/reference_${oneOrMoreCrossreferences}.svg`,
                scale: 0.25
            })
        });

        return [icon, crossReferenceIcon];
    }

    /**
     * Creates array of OL styles objects based on CombinedSymbols
     * @returns {Style[]} styles - array of OL styles
     */
    createSymbol() {
        return this.buildStyle();
    }
}