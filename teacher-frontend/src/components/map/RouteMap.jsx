import { useEffect, useRef } from 'react'
import Map from 'ol/Map.js'
import Feature from 'ol/Feature.js'
import LineString from 'ol/geom/LineString.js'
import Point from 'ol/geom/Point.js'
import TileLayer from 'ol/layer/Tile.js'
import VectorLayer from 'ol/layer/Vector.js'
import OSM from 'ol/source/OSM.js'
import VectorSource from 'ol/source/Vector.js'
import { Circle as CircleStyle, Fill, Stroke, Style } from 'ol/style.js'
import View from 'ol/View.js'
import { fromLonLat } from 'ol/proj.js'
import 'ol/ol.css'
import { convertRoutePointsToCoordinates, fitRouteExtent } from './mapUtils.js'
import './RouteMap.css'

const WUHAN_CENTER = [114.3055, 30.5928]

export default function RouteMap({
  center = WUHAN_CENTER,
  zoom = 11,
  routePath = [],
  points = [],
  studentObservations = [],
  onPointClick,
  onObservationClick,
  compact = false,
  className = '',
}) {
  const containerRef = useRef(null)
  const mapRef = useRef(null)
  const routeSourceRef = useRef(new VectorSource())
  const pointSourceRef = useRef(new VectorSource())
  const observationSourceRef = useRef(new VectorSource())

  useEffect(() => {
    if (!containerRef.current) return undefined

    const map = new Map({
      target: containerRef.current,
      layers: [
        new TileLayer({ source: new OSM() }),
        new VectorLayer({
          source: routeSourceRef.current,
          style: new Style({ stroke: new Stroke({ color: '#bd8f2e', width: 5 }) }),
        }),
        new VectorLayer({
          source: pointSourceRef.current,
          style: new Style({
            image: new CircleStyle({
              radius: 9,
              fill: new Fill({ color: '#416b3a' }),
              stroke: new Stroke({ color: '#fffdf4', width: 3 }),
            }),
          }),
        }),
        new VectorLayer({
          source: observationSourceRef.current,
          style: new Style({
            image: new CircleStyle({
              radius: 8,
              fill: new Fill({ color: '#c57835' }),
              stroke: new Stroke({ color: '#fff5df', width: 3 }),
            }),
          }),
        }),
      ],
      view: new View({ center: fromLonLat(center), zoom }),
      ...(compact ? { controls: [], interactions: [] } : {}),
    })
    mapRef.current = map

    return () => {
      map.setTarget(undefined)
      mapRef.current = null
    }
  }, [compact])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !Array.isArray(center) || center.length !== 2) return
    map.getView().setCenter(fromLonLat(center))
    map.getView().setZoom(zoom)
  }, [center, zoom])

  useEffect(() => {
    const source = routeSourceRef.current
    source.clear()
    const coordinates = convertRoutePointsToCoordinates(routePath)
    if (coordinates.length < 2) return

    const feature = new Feature({ geometry: new LineString(coordinates) })
    source.addFeature(feature)
    const map = mapRef.current
    if (!map) return undefined
    const frameId = window.requestAnimationFrame(() => {
      fitRouteExtent(map, feature.getGeometry().getExtent(), {
        padding: compact ? [28, 28, 28, 28] : [70, 70, 70, 70],
        maxZoom: compact ? 14 : 15,
        duration: compact ? 0 : 250,
      })
    })
    return () => window.cancelAnimationFrame(frameId)
  }, [compact, routePath])

  useEffect(() => {
    const source = pointSourceRef.current
    source.clear()
    const features = points.map((point) => {
      const longitude = Number(point.longitude)
      const latitude = Number(point.latitude)
      if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) return null
      return new Feature({
        geometry: new Point(fromLonLat([longitude, latitude])),
        mapItemType: 'point',
        mapItem: point,
      })
    }).filter(Boolean)
    source.addFeatures(features)
    if (routePath.length < 2 && features.length) {
      mapRef.current?.getView().fit(source.getExtent(), { padding: [70, 70, 70, 70], maxZoom: 15 })
    }
  }, [points, routePath.length])

  useEffect(() => {
    const source = observationSourceRef.current
    source.clear()
    const features = studentObservations.map((observation) => {
      const longitude = Number(observation.longitude)
      const latitude = Number(observation.latitude)
      if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) return null
      return new Feature({
        geometry: new Point(fromLonLat([longitude, latitude])),
        mapItemType: 'observation',
        mapItem: observation,
      })
    }).filter(Boolean)
    source.addFeatures(features)
  }, [studentObservations])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return undefined

    function getInteractiveFeature(pixel) {
      return map.forEachFeatureAtPixel(pixel, (feature) => (
        feature.get('mapItemType') ? feature : undefined
      ))
    }
    function handleClick(event) {
      const feature = getInteractiveFeature(event.pixel)
      if (!feature) return
      if (feature.get('mapItemType') === 'point') onPointClick?.(feature.get('mapItem'))
      if (feature.get('mapItemType') === 'observation') onObservationClick?.(feature.get('mapItem'))
    }
    function handlePointerMove(event) {
      map.getTargetElement().style.cursor = getInteractiveFeature(event.pixel) ? 'pointer' : ''
    }

    map.on('singleclick', handleClick)
    map.on('pointermove', handlePointerMove)
    return () => {
      map.un('singleclick', handleClick)
      map.un('pointermove', handlePointerMove)
    }
  }, [onObservationClick, onPointClick])

  return (
    <div
      ref={containerRef}
      className={`route-map${compact ? ' route-map--compact' : ''} ${className}`.trim()}
      data-route-points={routePath.length}
      data-markers={points.length + studentObservations.length}
      aria-label="路线地图"
    />
  )
}
