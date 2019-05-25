import RBush from "rbush";

export default class PointRBush extends RBush {

    toBBox(item) {
        return {minX: item.x, minY: item.y, maxX: item.x, maxY: item.y};
    }

    compareMinX(a, b) {
        return a.x - b.x;
    }

    compareMinY(a, b) {
        return a.y - b.y;
    }
}