import { useEffect, useRef, useState } from 'react'
import Feature from 'ol/Feature.js'
import Map from 'ol/Map.js'
import View from 'ol/View.js'
import Draw from 'ol/interaction/Draw.js'
import Modify from 'ol/interaction/Modify.js'
import TileLayer from 'ol/layer/Tile.js'
import VectorLayer from 'ol/layer/Vector.js'
import LineString from 'ol/geom/LineString.js'
import Point from 'ol/geom/Point.js'
import XYZ from 'ol/source/XYZ.js'
import VectorSource from 'ol/source/Vector.js'
import { toLonLat } from 'ol/proj.js'
import { Circle as CircleStyle, Fill, Stroke, Style } from 'ol/style.js'
import 'ol/ol.css'
import { convertLonLatToCoordinate, convertRoutePointsToCoordinates, fitRouteExtent, normalizeRoutePoints } from './mapUtils.js'
import './RouteEditorMap.css'

const DEFAULT_CENTER = [114.3055, 30.5928]
const TDT_KEY = "0436c3b458c21cbc6d044328bac31769"

const routeStyle = new Style({
  stroke: new Stroke({ color: '#b68a2a', width: 5 }),
})

const pointStyle = new Style({
  image: new CircleStyle({
    radius: 8,
    fill: new Fill({ color: '#245d46' }),
    stroke: new Stroke({ color: '#fff7da', width: 3 }),
  }),
})

const pendingPointStyle = new Style({
  image: new CircleStyle({
    radius: 9,
    fill: new Fill({ color: '#2f6fa3' }),
    stroke: new Stroke({ color: '#ffffff', width: 3 }),
  }),
})

const locatedPointStyle = new Style({
  image: new CircleStyle({
    radius: 8,
    fill: new Fill({ color: '#3d8b57' }),
    stroke: new Stroke({ color: '#f4fff5', width: 4 }),
  }),
})

export default function RouteEditorMap({ center = DEFAULT_CENTER, zoom = 11, initialPath = [], points = [], pendingPoint, onPathChange, onMapClick, onAddLocatedPoint }) {
  const targetRef = useRef(null)
  const mapRef = useRef(null)
  const sourceRef = useRef(null)
  const pointSourceRef = useRef(null)
  const locationSourceRef = useRef(null)
  const drawRef = useRef(null)
  const modifyRef = useRef(null)
  const drawingRef = useRef(false)
  const modifyingRef = useRef(false)
  const clickReleaseTimerRef = useRef(null)
  const onPathChangeRef = useRef(onPathChange)
  const onMapClickRef = useRef(onMapClick)
  const [drawing, setDrawing] = useState(false)
  const [modifying, setModifying] = useState(false)
  const [latitudeInput, setLatitudeInput] = useState('')
  const [longitudeInput, setLongitudeInput] = useState('')
  const [locatedPoint, setLocatedPoint] = useState(null)
  const [locationError, setLocationError] = useState('')
  const [locating, setLocating] = useState(false)
  const [locatedPointAdded, setLocatedPointAdded] = useState(false)

  useEffect(() => { onPathChangeRef.current = onPathChange }, [onPathChange])
  useEffect(() => { onMapClickRef.current = onMapClick }, [onMapClick])

  useEffect(() => {
    const vectorSource = new VectorSource()
    const pointSource = new VectorSource()
    const locationSource = new VectorSource()
    const map = new Map({
      target: targetRef.current,
      layers: [
        new TileLayer({
          source: new XYZ({
            projection: 'EPSG:3857',
            maxZoom: 18,
            tileUrlFunction: function(tileCoord) {
              if (!tileCoord) return undefined;

              const z = tileCoord[0];
              const x = tileCoord[1];
              const y = tileCoord[2];

              return `https://t0.tianditu.gov.cn/DataServer?T=img_w&x=${x}&y=${y}&l=${z}&tk=${TDT_KEY}`;
            },
          }),
        }),

        new TileLayer({
          source: new XYZ({
            projection: 'EPSG:3857',
            maxZoom: 18,
            tileUrlFunction: function(tileCoord) {
              if (!tileCoord) return undefined;

              const z = tileCoord[0];
              const x = tileCoord[1];
              const y = tileCoord[2];

              return `https://t0.tianditu.gov.cn/DataServer?T=cia_w&x=${x}&y=${y}&l=${z}&tk=${TDT_KEY}`;
            },
          }),
        }),

        
    
        new VectorLayer({ source: vectorSource, style: routeStyle }),
        new VectorLayer({ source: pointSource }),
        new VectorLayer({ source: locationSource, style: locatedPointStyle }),
      ],
      view: new View({
        center: convertLonLatToCoordinate({ longitude: center[0], latitude: center[1] }),
        zoom,
        minZoom: 8,
        maxZoom: 18,
      }),
    })
    map.on('singleclick', (event) => {
      if (drawingRef.current || modifyingRef.current) return
      const [longitude, latitude] = toLonLat(event.coordinate)
      onMapClickRef.current?.({ latitude, longitude })
    })

    mapRef.current = map
    sourceRef.current = vectorSource
    pointSourceRef.current = pointSource
    locationSourceRef.current = locationSource

    setTimeout(() => {
      map.updateSize()
    }, 300)

    return () => {
      if (drawRef.current) map.removeInteraction(drawRef.current)
      if (modifyRef.current) map.removeInteraction(modifyRef.current)
      if (clickReleaseTimerRef.current) window.clearTimeout(clickReleaseTimerRef.current)
      map.setTarget(undefined)
      drawRef.current = null
      modifyRef.current = null
      modifyingRef.current = false
      sourceRef.current = null
      pointSourceRef.current = null
      locationSourceRef.current = null
      mapRef.current = null
    }
  }, [])

  useEffect(() => {
    const source = sourceRef.current
    const map = mapRef.current
    if (!source || !map || drawing || modifying) return

    const path = normalizeRoutePoints(initialPath)
    source.clear()
    if (path.length < 2) return

    const geometry = new LineString(convertRoutePointsToCoordinates(path))
    source.addFeature(new Feature({ geometry }))
    fitRouteExtent(map, geometry.getExtent(), {
      padding: [70, 70, 70, 70],
      maxZoom: 16,
      duration: 250,
    })
  }, [initialPath, drawing, modifying])

  useEffect(() => {
    const source = pointSourceRef.current
    if (!source) return
    source.clear()

    normalizeRoutePoints(points).forEach((point) => {
      const feature = new Feature({ geometry: new Point(convertLonLatToCoordinate(point)) })
      feature.setStyle(pointStyle)
      source.addFeature(feature)
    })

    if (pendingPoint && Number.isFinite(Number(pendingPoint.longitude)) && Number.isFinite(Number(pendingPoint.latitude))) {
      const feature = new Feature({ geometry: new Point(convertLonLatToCoordinate(pendingPoint)) })
      feature.setStyle(pendingPointStyle)
      source.addFeature(feature)
    }
  }, [points, pendingPoint])

  useEffect(() => {
    const source = locationSourceRef.current
    if (!source) return
    source.clear()
    if (!locatedPoint) return
    source.addFeature(new Feature({
      geometry: new Point(convertLonLatToCoordinate(locatedPoint)),
    }))
  }, [locatedPoint])

  function moveToCoordinate(point) {
    const map = mapRef.current
    if (!map) return
    setLocatedPoint(point)
    setLocatedPointAdded(false)
    setLocationError('')
    map.getView().animate({
      center: convertLonLatToCoordinate(point),
      zoom: 16,
      duration: 500,
    })
  }

  function locateByInput(event) {
    event.preventDefault()
    const latitude = Number(latitudeInput)
    const longitude = Number(longitudeInput)
    const invalid = (
      latitudeInput.trim() === ''
      || longitudeInput.trim() === ''
      || !Number.isFinite(latitude)
      || !Number.isFinite(longitude)
      || latitude < -90
      || latitude > 90
      || longitude < -180
      || longitude > 180
    )
    if (invalid) {
      setLocationError('请输入有效经纬度')
      return
    }
    moveToCoordinate({ longitude, latitude })
  }

  function locateCurrentPosition() {
    if (!navigator.geolocation) {
      setLocationError('当前浏览器不支持位置定位，请使用经纬度定位。')
      return
    }
    setLocating(true)
    setLocationError('')
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const point = {
          longitude: position.coords.longitude,
          latitude: position.coords.latitude,
        }
        setLatitudeInput(point.latitude.toFixed(6))
        setLongitudeInput(point.longitude.toFixed(6))
        moveToCoordinate(point)
        setLocating(false)
      },
      () => {
        setLocationError('无法获取当前位置，请检查浏览器定位权限。')
        setLocating(false)
      },
      { enableHighAccuracy: true, timeout: 10000 },
    )
  }

  function addLocatedPoint() {
    if (!locatedPoint || drawing || modifying || locatedPointAdded) return
    onAddLocatedPoint?.(locatedPoint)
    setLocatedPointAdded(true)
  }

  function startDrawing() {
    const map = mapRef.current
    const source = sourceRef.current
    if (!map || !source) return

    if (drawRef.current) map.removeInteraction(drawRef.current)
    if (modifyRef.current) {
      map.removeInteraction(modifyRef.current)
      modifyRef.current = null
      modifyingRef.current = false
      setModifying(false)
    }
    source.clear()

    const draw = new Draw({ source, type: 'LineString' })
    drawRef.current = draw
    map.addInteraction(draw)
    drawingRef.current = true
    setDrawing(true)

    draw.once('drawend', (event) => {
      const path = event.feature.getGeometry().getCoordinates().map((coordinate, orderIndex) => {
        const [longitude, latitude] = toLonLat(coordinate)
        return { latitude, longitude, order_index: orderIndex }
      })
      map.removeInteraction(draw)
      drawRef.current = null
      clickReleaseTimerRef.current = window.setTimeout(() => {
        drawingRef.current = false
        clickReleaseTimerRef.current = null
      }, 350)
      setDrawing(false)
      onPathChangeRef.current?.(path)
    })
  }

  function startModifying() {
    const map = mapRef.current
    const source = sourceRef.current
    if (!map || !source || source.getFeatures().length === 0) return

    const modify = new Modify({ source })
    modifyRef.current = modify
    modifyingRef.current = true
    map.addInteraction(modify)
    setModifying(true)

    modify.on('modifyend', (event) => {
      const feature = event.features.item(0)
      const coordinates = feature?.getGeometry()?.getCoordinates?.() || []
      const nextPath = coordinates.map((coordinate, orderIndex) => {
        const [longitude, latitude] = toLonLat(coordinate)
        return { latitude, longitude, order_index: orderIndex }
      })
      onPathChangeRef.current?.(nextPath)
    })
  }

  function finishModifying() {
    const map = mapRef.current
    if (modifyRef.current) map?.removeInteraction(modifyRef.current)
    modifyRef.current = null
    modifyingRef.current = false
    setModifying(false)
  }

  function cancelDrawing() {
    const map = mapRef.current
    const source = sourceRef.current
    if (drawRef.current) map?.removeInteraction(drawRef.current)
    drawRef.current = null
    drawingRef.current = false
    source?.clear()
    setDrawing(false)
  }

  return (
    <div className="route-editor-map-shell">
      <div className="route-editor-toolbar">
        <div>
          <strong>{drawing ? '正在绘制路线' : modifying ? '正在调整已有路线' : '路线轨迹'}</strong>
          <span>{drawing ? '依次点击地图设置节点，双击结束绘制' : modifying ? '拖动路线节点调整位置，完成后保存路线轨迹' : '可拖动调整已有节点，也可清空后重新绘制路线'}</span>
        </div>
        <div className="route-editor-toolbar__actions">
          {drawing ? (
            <button className="secondary-button" type="button" onClick={cancelDrawing}>取消绘制</button>
          ) : modifying ? (
            <button className="primary-button" type="button" onClick={finishModifying}>完成调整</button>
          ) : (
            <>
              <button className="secondary-button" type="button" disabled={normalizeRoutePoints(initialPath).length < 2} onClick={startModifying}>调整已有路线</button>
              <button className="primary-button" type="button" onClick={startDrawing}>开始绘制路线</button>
            </>
          )}
        </div>
      </div>
      <form className="route-coordinate-toolbar" onSubmit={locateByInput}>
        <div className="route-coordinate-toolbar__title">
          <strong>坐标定位</strong>
          <span>输入 WGS84 经纬度后移动地图，不会自动加入路线。</span>
        </div>
        <label>
          <span>纬度</span>
          <input value={latitudeInput} onChange={(event) => setLatitudeInput(event.target.value)} inputMode="decimal" placeholder="30.546403" aria-label="纬度" />
        </label>
        <label>
          <span>经度</span>
          <input value={longitudeInput} onChange={(event) => setLongitudeInput(event.target.value)} inputMode="decimal" placeholder="114.315601" aria-label="经度" />
        </label>
        <div className="route-coordinate-toolbar__actions">
          <button className="secondary-button" type="button" disabled={locating} onClick={locateCurrentPosition}>{locating ? '正在定位…' : '当前我的位置'}</button>
          <button className="primary-button" type="submit">输入坐标定位</button>
        </div>
        {locationError && <p className="route-coordinate-error" role="alert">{locationError}</p>}
        {locatedPoint && !locationError && (
          <div className="route-located-point" role="status">
            <span>当前位置：{locatedPoint.latitude.toFixed(6)}, {locatedPoint.longitude.toFixed(6)}</span>
            <button type="button" disabled={drawing || modifying || locatedPointAdded} onClick={addLocatedPoint}>{locatedPointAdded ? '已加入路线' : '加入路线'}</button>
          </div>
        )}
      </form>
      <div ref={targetRef} className="route-editor-map" aria-label="路线绘制地图" />
    </div>
  )
}
