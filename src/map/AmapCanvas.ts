/* global AMap */
import {MapBase} from './MapBase';
import _ from 'lodash';
import * as PIXI from 'pixi.js';
import ZR from 'zrender';
import {Coord2Pix, BD2GCJ, GCJ2GPS} from '@/map/coordinate';
import * as Terraformer from 'terraformer';

export default class AmapCanvas extends MapBase {
    public PointType = 'GCJ';

    public toLnglat(x, y, z) {
        let n = Math.pow(2, z);
        let lng = (x / n) * 360.0 - 180.0;
        let lat = Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / n)));
        lat = (lat * 180.0) / Math.PI;
        return [lng, lat];
    }

    public init(container: HTMLDivElement) {
        const me = this;
        me.map = new AMap.Map(container, {
            resizeEnable: true,
            zoom: 15,
            center: new AMap.LngLat(120.236463, 35.958023),
            animateEnable: true,
        });

        const createTile = (x, y, z, success, fail) => {
            let NWPoint: any = me.toLnglat(x, y, z);
            NWPoint = {lng: NWPoint[0], lat: NWPoint[1]};
            /* 左上角 */
            let NW = me.map.lngLatToContainer(
                new AMap.LngLat(NWPoint.lng, NWPoint.lat)
            );
            /* 右上 */
            let NE = [NW.x + 256, NW.y];
            let NEPoint = me.map.containerToLngLat(
                new AMap.Pixel(NE[0], NE[1])
            );
            /* 右下角 */
            let SE = [NW.x + 256, NW.y + 256];
            let SEPoint = me.map.containerToLngLat(
                new AMap.Pixel(SE[0], SE[1])
            );
            /* 左下 */
            let SW = [NW.x, NW.y + 256];
            let SWPoint = me.map.containerToLngLat(
                new AMap.Pixel(SW[0], SW[1])
            );
            let points = [NWPoint, NEPoint, SEPoint, SWPoint];

            points = points.map(e => {
                e = GCJ2GPS(e);
                return [e.lng, e.lat];
            });

            let bound = {
                minlng: points[3][0],
                minlat: points[3][1],
                maxlng: points[1][0],
                maxlat: points[1][1],
                width: 256,
                height: 256,
                zoom: z,
            };
            let C2P = new Coord2Pix(
                bound.maxlng,
                bound.minlng,
                bound.maxlat,
                bound.minlat,
                bound.height,
                bound.width
            );
            let polygon = new Terraformer.Primitive(
                new Terraformer.Polygon([
                    [
                        [points[0][0], points[0][1]],
                        [points[1][0], points[1][1]],
                        [points[2][0], points[2][1]],
                        [points[3][0], points[3][1]],
                    ],
                ])
            );
            const canvas = document.createElement('canvas');
            const zr = ZR.init(canvas, {width: 256, height: 256});
            me.store.withinstream(polygon, e => {
                let point = e.geometry.coordinates;
                let pix = C2P.corrd2pix(point[0], point[1]);
                var circle = new ZR.Circle({
                    shape: {
                        cx: pix.x,
                        cy: pix.y,
                        r: 5,
                    },
                    style: {
                        fill: '#eeeeee',
                        stroke: '#F00',
                    },
                });
                circle.on('click', e => {
                    console.log(e);
                });
                zr.add(circle);
            });
            success(canvas);
        };

        me.map.on('complete', function() {
            const alayer = new AMap.TileLayer.Flexible({
                createTile: createTile,
                map: me.map,
                zIndex: 100,
                zooms: [3, 18],
                cacheSize: 20,
                visible: true,
            });
            me.EventBus.emit('mapLoaded');
            me.maploaded();
            me.addToolBar();
        });
    }

    public getBounds() {
        let bounds = this.map.getBounds();
        let size = this.map.getSize();
        return {
            minlng: bounds.southwest['lng'],
            minlat: bounds.southwest['lat'],
            maxlng: bounds.northeast['lng'],
            maxlat: bounds.northeast['lat'],
            width: size.width,
            height: size.height,
            zoom: this.map.getZoom(),
        };
    }

    public panTo(lng: number, lat: number) {
        this.map.panTo(new AMap.LngLat(lng, lat));
    }

    public panBy(x: number, y: number) {
        this.map.panBy(x, y);
    }

    public zoomIn(x: number, y: number) {
        if (this.map.getZoom() < 18) {
            let center = this.pix2gps(x, y);
            this.panTo(center.lng, center.lat);
            this.map.zoomIn();
        }
    }

    public zoomOut(x: number, y: number) {
        if (this.map.getZoom() > 6) {
            let center = this.pix2gps(x, y);
            this.panTo(center.lng, center.lat);
            this.map.zoomOut();
        }
    }

    public gps2pix(lng: number, lat: number) {
        return this.map.lnglatTocontainer([lng, lat]);
    }

    public pix2gps(x: number, y: number) {
        return this.map.containerToLngLat(new AMap.Pixel(x, y));
    }

    /**
     * 地图控件类
     */
    public addScale() {
        let mapObj = this.map;
        mapObj.plugin(['AMap.Scale'], function() {
            mapObj.addControl(new AMap.Scale());
        });
    }

    public addToolBar() {
        let mapObj = this.map;
        mapObj.plugin(['AMap.ToolBar'], function() {
            mapObj.addControl(new AMap.ToolBar());
        });
    }

    public addOverView() {
        let mapObj = this.map;
        mapObj.plugin(['AMap.OverView'], function() {
            mapObj.addControl(new AMap.OverView());
        });
    }

    public addMapType() {
        let mapObj = this.map;
        mapObj.plugin(['AMap.MapType'], function() {
            mapObj.addControl(new AMap.MapType());
        });
    }

    public addGeolocation() {
        let mapObj = this.map;
        mapObj.plugin(['AMap.Geolocation'], function() {
            mapObj.addControl(new AMap.Geolocation());
        });
    }
}
