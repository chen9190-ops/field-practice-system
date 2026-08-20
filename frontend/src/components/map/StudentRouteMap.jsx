import React, { useEffect, useRef, useState } from "react";
import Feature from "ol/Feature.js";
import GeoJSON from "ol/format/GeoJSON.js";
import Map from "ol/Map.js";
import View from "ol/View.js";
import LineString from "ol/geom/LineString.js";
import Point from "ol/geom/Point.js";
import TileLayer from "ol/layer/Tile.js";
import VectorLayer from "ol/layer/Vector.js";
import { fromLonLat, toLonLat } from "ol/proj.js";
import VectorSource from "ol/source/Vector.js";
import XYZ from "ol/source/XYZ.js";
import { Circle as CircleStyle, Fill, Stroke, Style } from "ol/style.js";
import {
  getFaultData,
  getLithologyData,
  getStratigraphyData,
} from "../../services/geologyService";
import { GeologyLayerControl } from "./GeologyLayerControl";
import { getDefaultGeologyLayers, getDefaultMapMode } from "../../utils/settings";
import { OFFLINE_TILE_TEMPLATE, offlineTileLoadFunction } from "../../offline/offlineMap";
import "ol/ol.css";

const WUHAN_CENTER = [114.3055, 30.5928];
const TDT_KEY = typeof import.meta.env.VITE_TDT_KEY === "string"
  ? import.meta.env.VITE_TDT_KEY.trim()
  : "";

function createTiandituSource(layer) {
  return new XYZ({
    projection: "EPSG:3857",
    maxZoom: 18,
    crossOrigin: "anonymous",
    tileUrlFunction: (tileCoord) => {
      if (!tileCoord) return undefined;

      const [zoom, tileX, xyzTileY] = tileCoord;
      const subdomain = Math.abs(tileX + xyzTileY) % 8;

      return `https://t${subdomain}.tianditu.gov.cn/DataServer?T=${layer}&x=${tileX}&y=${xyzTileY}&l=${zoom}&tk=${encodeURIComponent(TDT_KEY)}`;
    },
  });
}

const routeStyle = new Style({
  stroke: new Stroke({ color: "#6f913f", width: 6 }),
});

const pointStyle = new Style({
  image: new CircleStyle({
    radius: 10,
    fill: new Fill({ color: "#e8962d" }),
    stroke: new Stroke({ color: "#fff8df", width: 4 }),
  }),
});

const pendingCheckinPointStyle = new Style({
  image: new CircleStyle({
    radius: 11,
    fill: new Fill({ color: "#e4bc62" }),
    stroke: new Stroke({ color: "#7a8b54", width: 4, lineDash: [3, 3] }),
  }),
});

function getPointStyle(feature) {
  return feature.get("pointData")?.offline_checkin_pending
    ? pendingCheckinPointStyle
    : pointStyle;
}

const studentObservationStyle = new Style({
  image: new CircleStyle({
    radius: 9,
    fill: new Fill({ color: "#3984c6" }),
    stroke: new Stroke({ color: "#eaf5ff", width: 4 }),
  }),
});

const studentTrackStyle = new Style({
  stroke: new Stroke({ color: "rgba(47, 111, 201, .78)", width: 4 }),
});

const studentPositionStyle = new Style({
  image: new CircleStyle({
    radius: 9,
    fill: new Fill({ color: "#2f6fc9" }),
    stroke: new Stroke({ color: "#ffffff", width: 4 }),
  }),
});

const lithologyPalette = ["#d89b5b", "#7fa3a6", "#c9ae62", "#9c8268", "#839a68"];
const lithologyStyleCache = {};

function getLithologyStyle(feature) {
  const rockType = String(feature.get("rock_type") || "未分类岩性");
  const featureColor = String(feature.get("color") || "");
  const cacheKey = `${rockType}:${featureColor}`;
  if (!lithologyStyleCache[cacheKey]) {
    const colorIndex = [...rockType].reduce((total, character) => total + character.charCodeAt(0), 0)
      % lithologyPalette.length;
    const color = /^#[0-9a-f]{6}$/i.test(featureColor)
      ? featureColor
      : lithologyPalette[colorIndex];
    lithologyStyleCache[cacheKey] = new Style({
      fill: new Fill({ color: `${color}66` }),
      stroke: new Stroke({ color, width: 1.5 }),
      image: new CircleStyle({
        radius: 6,
        fill: new Fill({ color }),
        stroke: new Stroke({ color: "#fff4d2", width: 2 }),
      }),
    });
  }
  return lithologyStyleCache[cacheKey];
}

const stratigraphyPalette = ["#849b55", "#c59d54", "#799aa3", "#a77d72", "#8d83a5"];
const stratigraphyStyleCache = {};

function getStratigraphyStyle(feature) {
  const category = String(
    feature.get("age") || feature.get("period") || feature.get("category") || "default",
  );
  if (!stratigraphyStyleCache[category]) {
    const colorIndex = [...category].reduce((total, character) => total + character.charCodeAt(0), 0)
      % stratigraphyPalette.length;
    const color = stratigraphyPalette[colorIndex];
    stratigraphyStyleCache[category] = new Style({
      fill: new Fill({ color: `${color}66` }),
      stroke: new Stroke({ color, width: 1.5 }),
      image: new CircleStyle({
        radius: 6,
        fill: new Fill({ color }),
        stroke: new Stroke({ color: "#fff4d2", width: 2 }),
      }),
    });
  }
  return stratigraphyStyleCache[category];
}

const faultStyle = new Style({
  fill: new Fill({ color: "rgba(184, 63, 50, .14)" }),
  stroke: new Stroke({ color: "#b83f32", width: 3 }),
  image: new CircleStyle({
    radius: 6,
    fill: new Fill({ color: "#b83f32" }),
    stroke: new Stroke({ color: "#fff4d2", width: 2 }),
  }),
});

function validCoordinates(items) {
  return Array.isArray(items)
    ? items.filter((item) => Number.isFinite(Number(item.longitude)) && Number.isFinite(Number(item.latitude)))
    : [];
}

export function StudentRouteMap({
  routePath = [],
  points = [],
  studentObservations = [],
  currentPosition = null,
  studentTrack = [],
  focusPoint = null,
  onPointClick,
  onStudentObservationClick,
  onGeologyFeatureClick,
  onCurrentPositionSelect,
  onElevationProfileOpen,
  offlineMode = false,
}) {
  const [baseMapMode, setBaseMapMode] = useState(getDefaultMapMode);
  const [isTerrainVisible, setIsTerrainVisible] = useState(false);
  const [terrainOpacity, setTerrainOpacity] = useState(0.45);
  const [geologyVisibility, setGeologyVisibility] = useState(getDefaultGeologyLayers);
  const [isMapMenuOpen, setIsMapMenuOpen] = useState(false);
  const [isMapToolsOpen, setIsMapToolsOpen] = useState(false);
  const targetRef = useRef(null);
  const mapToolsRef = useRef(null);
  const mapRef = useRef(null);
  const baseLayersRef = useRef({ standard: [], satellite: [] });
  const terrainLayerRef = useRef(null);
  const geologyLayersRef = useRef({ lithology: null, stratigraphy: null, fault: null });
  const routeSourceRef = useRef(null);
  const pointSourceRef = useRef(null);
  const studentObservationSourceRef = useRef(null);
  const studentTrackSourceRef = useRef(null);
  const studentPositionSourceRef = useRef(null);
  const hasFocusedPositionRef = useRef(false);
  const onPointClickRef = useRef(onPointClick);
  const onStudentObservationClickRef = useRef(onStudentObservationClick);
  const onGeologyFeatureClickRef = useRef(onGeologyFeatureClick);
  const onCurrentPositionSelectRef = useRef(onCurrentPositionSelect);

  useEffect(() => {
    onPointClickRef.current = onPointClick;
  }, [onPointClick]);

  useEffect(() => {
    onStudentObservationClickRef.current = onStudentObservationClick;
  }, [onStudentObservationClick]);

  useEffect(() => {
    onGeologyFeatureClickRef.current = onGeologyFeatureClick;
  }, [onGeologyFeatureClick]);

  useEffect(() => {
    onCurrentPositionSelectRef.current = onCurrentPositionSelect;
  }, [onCurrentPositionSelect]);

  useEffect(() => {
    if (!isMapToolsOpen) return undefined;

    const handleOutsidePointerDown = (event) => {
      if (mapToolsRef.current?.contains(event.target)) return;
      setIsMapToolsOpen(false);
      setIsMapMenuOpen(false);
    };
    document.addEventListener("pointerdown", handleOutsidePointerDown);
    return () => document.removeEventListener("pointerdown", handleOutsidePointerDown);
  }, [isMapToolsOpen]);

  useEffect(() => {
    let active = true;
    const routeSource = new VectorSource();
    const pointSource = new VectorSource();
    const studentObservationSource = new VectorSource();
    const studentTrackSource = new VectorSource();
    const studentPositionSource = new VectorSource();
    // VITE_TDT_KEY 缺失时天地图图层无法创建，使用免 key 的 HTTPS 兜底底图
    // （CartoDB/OSM 数据，WGS84 Web 墨卡托，与现有矢量叠加对齐；
    //  注：OpenTopoMap/OSM 官方瓦片域在国内网络不可达，不能用作兜底），
    // 避免生产环境底图空白。
    const createFallbackBaseLayer = (visible) =>
      new TileLayer({
        source: new XYZ({
          url: "https://basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png",
          projection: "EPSG:3857",
          maxZoom: 18,
          crossOrigin: "anonymous",
          attributions: "© OpenStreetMap contributors © CARTO",
        }),
        visible,
      });
    const standardBaseLayers = TDT_KEY
      ? [
          new TileLayer({ source: createTiandituSource("vec_w"), visible: true }),
          new TileLayer({ source: createTiandituSource("cva_w"), visible: true }),
        ]
      : [createFallbackBaseLayer(true)];
    const satelliteBaseLayers = TDT_KEY
      ? [
          new TileLayer({ source: createTiandituSource("img_w"), visible: false }),
          new TileLayer({ source: createTiandituSource("cia_w"), visible: false }),
        ]
      : [createFallbackBaseLayer(false)];
    const baseLayers = [...standardBaseLayers, ...satelliteBaseLayers];
    const terrainLayer = new TileLayer({
      source: new XYZ({
        url: OFFLINE_TILE_TEMPLATE,
        projection: "EPSG:3857",
        maxZoom: 17,
        crossOrigin: "anonymous",
        attributions: "© OpenStreetMap contributors, SRTM | Map style: © OpenTopoMap (CC-BY-SA)",
        tileLoadFunction: offlineTileLoadFunction,
      }),
      visible: offlineMode,
      opacity: offlineMode ? 1 : 0.45,
    });
    const lithologyLayer = new VectorLayer({
      source: new VectorSource(),
      style: getLithologyStyle,
      visible: false,
    });
    const stratigraphyLayer = new VectorLayer({
      source: new VectorSource(),
      style: getStratigraphyStyle,
      visible: false,
    });
    const faultLayer = new VectorLayer({
      source: new VectorSource(),
      style: faultStyle,
      visible: false,
    });
    const geologyLayers = {
      lithology: lithologyLayer,
      stratigraphy: stratigraphyLayer,
      fault: faultLayer,
    };
    baseLayersRef.current = {
      standard: standardBaseLayers,
      satellite: satelliteBaseLayers,
    };
    terrainLayerRef.current = terrainLayer;
    geologyLayersRef.current = geologyLayers;
    const map = new Map({
      target: targetRef.current,
      layers: [
        ...baseLayers,
        terrainLayer,
        geologyLayers.lithology,
        geologyLayers.stratigraphy,
        geologyLayers.fault,
        new VectorLayer({ source: routeSource, style: routeStyle }),
        new VectorLayer({ source: pointSource, style: getPointStyle }),
        new VectorLayer({ source: studentObservationSource, style: studentObservationStyle }),
        new VectorLayer({ source: studentTrackSource, style: studentTrackStyle }),
        new VectorLayer({ source: studentPositionSource, style: studentPositionStyle }),
      ],
      view: new View({ center: fromLonLat(WUHAN_CENTER), zoom: 11 }),
    });
    const geoJsonFormat = new GeoJSON();
    [
      ["lithology", getLithologyData],
      ["stratigraphy", getStratigraphyData],
      ["fault", getFaultData],
    ].forEach(([layerKey, loadData]) => {
      loadData()
        .then((featureCollection) => {
          if (!active) return;
          const features = geoJsonFormat.readFeatures(featureCollection, {
            dataProjection: "EPSG:4326",
            featureProjection: "EPSG:3857",
          });
          geologyLayers[layerKey].getSource().addFeatures(features);
        })
        .catch(() => {
          // Keep the optional geology layer empty when its data source is unavailable.
        });
    });
    const updateSizeFrame = requestAnimationFrame(() => {
      map.updateSize();
    });

    map.on("singleclick", (event) => {
      const selectedFeature = map.forEachFeatureAtPixel(
        event.pixel,
        (feature) => {
          const pointData = feature.get("pointData");
          if (pointData) return { type: "point", data: pointData };
          const studentObservationData = feature.get("studentObservationData");
          if (studentObservationData) {
            return { type: "student-observation", data: studentObservationData };
          }
          return undefined;
        },
        { hitTolerance: 8 },
      );
      if (selectedFeature?.type === "point") {
        onPointClickRef.current?.(selectedFeature.data);
      } else if (selectedFeature?.type === "student-observation") {
        onStudentObservationClickRef.current?.(selectedFeature.data);
      } else {
        const currentPositionFeature = map.forEachFeatureAtPixel(
          event.pixel,
          (feature) => (studentPositionSource.hasFeature(feature) ? feature : undefined),
          { hitTolerance: 8 },
        );
        if (currentPositionFeature) {
          const [longitude, latitude] = toLonLat(
            currentPositionFeature.getGeometry().getCoordinates(),
          );
          onCurrentPositionSelectRef.current?.({ longitude, latitude });
          return;
        }

        const selectedGeologyFeature = map.forEachFeatureAtPixel(
          event.pixel,
          (feature, layer) => {
            const layerEntry = Object.entries(geologyLayers)
              .find(([, geologyLayer]) => geologyLayer === layer);
            return layerEntry ? { feature, layerType: layerEntry[0] } : undefined;
          },
          { hitTolerance: 5 },
        );
        if (selectedGeologyFeature) {
          const properties = { ...selectedGeologyFeature.feature.getProperties() };
          delete properties.geometry;
          const [longitude, latitude] = toLonLat(event.coordinate);
          onGeologyFeatureClickRef.current?.({
            layerType: selectedGeologyFeature.layerType,
            name: properties.name || properties.rock_type || properties.period || "未命名地质要素",
            properties,
            longitude,
            latitude,
          });
        }
      }
    });

    map.on("pointermove", (event) => {
      const hasPoint = map.forEachFeatureAtPixel(
        event.pixel,
        (feature, layer) => Boolean(
          feature.get("pointData")
          || feature.get("studentObservationData")
          || studentPositionSource.hasFeature(feature)
          || Object.values(geologyLayers).includes(layer),
        ),
        { hitTolerance: 6 },
      );
      map.getTargetElement().style.cursor = hasPoint ? "pointer" : "";
    });

    mapRef.current = map;
    routeSourceRef.current = routeSource;
    pointSourceRef.current = pointSource;
    studentObservationSourceRef.current = studentObservationSource;
    studentTrackSourceRef.current = studentTrackSource;
    studentPositionSourceRef.current = studentPositionSource;

    return () => {
      active = false;
      cancelAnimationFrame(updateSizeFrame);
      map.setTarget(undefined);
      mapRef.current = null;
      baseLayersRef.current = { standard: [], satellite: [] };
      terrainLayerRef.current = null;
      geologyLayersRef.current = { lithology: null, stratigraphy: null, fault: null };
      routeSourceRef.current = null;
      pointSourceRef.current = null;
      studentObservationSourceRef.current = null;
      studentTrackSourceRef.current = null;
      studentPositionSourceRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!terrainLayerRef.current) return;
    if (offlineMode) {
      baseLayersRef.current.standard.forEach((layer) => layer.setVisible(false));
      baseLayersRef.current.satellite.forEach((layer) => layer.setVisible(false));
      terrainLayerRef.current.setVisible(true);
      terrainLayerRef.current.setOpacity(1);
    }
  }, [offlineMode]);

  useEffect(() => {
    const baseLayers = baseLayersRef.current;
    baseLayers.standard.forEach((layer) => layer.setVisible(!offlineMode && baseMapMode === "standard"));
    baseLayers.satellite.forEach((layer) => layer.setVisible(!offlineMode && baseMapMode === "satellite"));
  }, [baseMapMode, offlineMode]);

  useEffect(() => {
    terrainLayerRef.current?.setVisible(offlineMode || isTerrainVisible);
  }, [isTerrainVisible, offlineMode]);

  useEffect(() => {
    terrainLayerRef.current?.setOpacity(offlineMode ? 1 : terrainOpacity);
  }, [terrainOpacity, offlineMode]);

  useEffect(() => {
    Object.entries(geologyVisibility).forEach(([layerKey, isVisible]) => {
      geologyLayersRef.current[layerKey]?.setVisible(isVisible);
    });
  }, [geologyVisibility]);

  useEffect(() => {
    const map = mapRef.current;
    const longitude = Number(focusPoint?.longitude);
    const latitude = Number(focusPoint?.latitude);
    if (!map || !Number.isFinite(longitude) || !Number.isFinite(latitude)) return;

    const view = map.getView();
    view.animate({
      center: fromLonLat([longitude, latitude]),
      zoom: Math.max(view.getZoom() ?? 0, 16),
      duration: 500,
    });
  }, [focusPoint]);

  useEffect(() => {
    const map = mapRef.current;
    const routeSource = routeSourceRef.current;
    const pointSource = pointSourceRef.current;
    if (!map || !routeSource || !pointSource) return;

    routeSource.clear();
    pointSource.clear();
    const path = validCoordinates(routePath)
      .sort((first, second) => Number(first.order_index ?? 0) - Number(second.order_index ?? 0));
    const visiblePoints = validCoordinates(points);

    if (path.length >= 2) {
      routeSource.addFeature(new Feature({
        geometry: new LineString(path.map((item) => fromLonLat([Number(item.longitude), Number(item.latitude)]))),
      }));
    }

    visiblePoints.forEach((point) => {
      pointSource.addFeature(new Feature({
        geometry: new Point(fromLonLat([Number(point.longitude), Number(point.latitude)])),
        pointData: point,
      }));
    });

    const extentSource = path.length >= 2 ? routeSource : pointSource;
    if (!extentSource.isEmpty()) {
      map.getView().fit(extentSource.getExtent(), {
        padding: [100, 45, 190, 45],
        maxZoom: 16,
        duration: 350,
      });
    }
  }, [points, routePath]);

  useEffect(() => {
    const studentObservationSource = studentObservationSourceRef.current;
    if (!studentObservationSource) return;

    studentObservationSource.clear();
    validCoordinates(studentObservations).forEach((observation) => {
      studentObservationSource.addFeature(new Feature({
        geometry: new Point(fromLonLat([
          Number(observation.longitude),
          Number(observation.latitude),
        ])),
        studentObservationData: observation,
      }));
    });
  }, [studentObservations]);

  useEffect(() => {
    const map = mapRef.current;
    const trackSource = studentTrackSourceRef.current;
    const positionSource = studentPositionSourceRef.current;
    if (!map || !trackSource || !positionSource) return;

    trackSource.clear();
    positionSource.clear();

    const track = validCoordinates(studentTrack);
    if (track.length >= 2) {
      trackSource.addFeature(new Feature({
        geometry: new LineString(track.map((item) => fromLonLat([Number(item.longitude), Number(item.latitude)]))),
      }));
    }

    const position = validCoordinates(currentPosition ? [currentPosition] : [])[0];
    if (position) {
      const coordinate = fromLonLat([Number(position.longitude), Number(position.latitude)]);
      positionSource.addFeature(new Feature({ geometry: new Point(coordinate) }));
      if (!hasFocusedPositionRef.current) {
        map.getView().setCenter(coordinate);
        map.getView().setZoom(17);
        hasFocusedPositionRef.current = true;
      }
    } else if (studentTrack.length === 0) {
      hasFocusedPositionRef.current = false;
    }
  }, [currentPosition, studentTrack]);

  function handleCurrentPositionSelect() {
    const position = validCoordinates(currentPosition ? [currentPosition] : [])[0];
    const map = mapRef.current;
    if (!position || !map) return;

    const longitude = Number(position.longitude);
    const latitude = Number(position.latitude);
    map.getView().animate({
      center: fromLonLat([longitude, latitude]),
      zoom: Math.max(map.getView().getZoom() ?? 0, 17),
      duration: 350,
    });
    onCurrentPositionSelectRef.current?.({ longitude, latitude });
    setIsMapToolsOpen(false);
    setIsMapMenuOpen(false);
  }

  function handleElevationProfileOpen() {
    onElevationProfileOpen?.();
    setIsMapToolsOpen(false);
    setIsMapMenuOpen(false);
  }

  return (
    <>
      <div ref={targetRef} className="student-route-map__canvas" aria-label="实习路线地图" />
      <div ref={mapToolsRef} className="student-map-tools">
        <div
          id="student-map-tools-menu"
          className={`student-map-tools__menu ${isMapToolsOpen ? "is-open" : ""}`}
          aria-hidden={!isMapToolsOpen}
          inert={!isMapToolsOpen}
        >
          <button
            type="button"
            className="student-map-tools__action"
            onClick={() => setIsMapMenuOpen((current) => !current)}
            aria-expanded={isMapMenuOpen}
            aria-controls="student-map-layer-menu"
          >
            地图
          </button>
          {isMapMenuOpen && (
            <div
              id="student-map-layer-menu"
              className="student-map-tools__layer-menu"
              role="group"
              aria-label="地图图层"
            >
              <GeologyLayerControl
                baseMapMode={baseMapMode}
                baseMapDisabled={!TDT_KEY}
                terrainVisible={isTerrainVisible}
                terrainOpacity={terrainOpacity}
                geologyVisibility={geologyVisibility}
                onBaseMapModeChange={setBaseMapMode}
                onTerrainToggle={() => setIsTerrainVisible((current) => !current)}
                onTerrainOpacityChange={setTerrainOpacity}
                onGeologyToggle={(layerKey) => {
                  setGeologyVisibility((current) => ({
                    ...current,
                    [layerKey]: !current[layerKey],
                  }));
                }}
              />
            </div>
          )}
          <button
            type="button"
            className="student-map-tools__action"
            onClick={handleCurrentPositionSelect}
            disabled={!currentPosition}
          >
            当前位置
          </button>
          <button
            type="button"
            className="student-map-tools__action"
            onClick={handleElevationProfileOpen}
          >
            查看地形剖面
          </button>
        </div>
        <button
          type="button"
          className="student-map-tools__toggle"
          onClick={() => {
            setIsMapToolsOpen((current) => {
              if (current) setIsMapMenuOpen(false);
              return !current;
            });
          }}
          aria-expanded={isMapToolsOpen}
          aria-controls="student-map-tools-menu"
          aria-label={isMapToolsOpen ? "收起地图工具" : "展开地图工具"}
        >
          <span className="student-map-tools__chevron" aria-hidden="true">›</span>
        </button>
      </div>
    </>
  );
}
