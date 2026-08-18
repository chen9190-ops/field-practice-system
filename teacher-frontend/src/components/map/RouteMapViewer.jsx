import { useEffect, useMemo, useRef } from 'react'
import Feature from 'ol/Feature.js'
import LineString from 'ol/geom/LineString.js'
import Map from 'ol/Map.js'
import TileLayer from 'ol/layer/Tile.js'
import VectorLayer from 'ol/layer/Vector.js'
import OSM from 'ol/source/OSM.js'
import VectorSource from 'ol/source/Vector.js'
import { Stroke, Style } from 'ol/style.js'
import View from 'ol/View.js'
import 'ol/ol.css'
import { convertRoutePointsToCoordinates, fitRouteExtent } from './mapUtils.js'
import './RouteMapViewer.css'

const ROUTE_STYLE = new Style({
  stroke: new Stroke({ color: '#b68a2a', width: 5 }),
})

function RouteMapViewerCanvas({ coordinates, compact }) {
  const targetRef = useRef(null)
  const mapRef = useRef(null)
  const routeSourceRef = useRef(new VectorSource())

  useEffect(() => {
    if (!targetRef.current) return undefined

    const map = new Map({
      target: targetRef.current,
      layers: [
        new TileLayer({ source: new OSM() }),
        new VectorLayer({ source: routeSourceRef.current, style: ROUTE_STYLE }),
      ],
      view: new View({ zoom: 11 }),
      ...(compact ? { controls: [], interactions: [] } : {}),
    })
    mapRef.current = map

    const resizeObserver = new ResizeObserver(() => map.updateSize())
    resizeObserver.observe(targetRef.current)

    return () => {
      resizeObserver.disconnect()
      map.setTarget(undefined)
      mapRef.current = null
    }
  }, [compact])

  useEffect(() => {
    const map = mapRef.current
    const source = routeSourceRef.current
    if (!map) return undefined

    source.clear()
    const feature = new Feature({ geometry: new LineString(coordinates) })
    source.addFeature(feature)

    const frameId = window.requestAnimationFrame(() => {
      fitRouteExtent(map, feature.getGeometry().getExtent())
    })
    return () => window.cancelAnimationFrame(frameId)
  }, [coordinates])

  return <div ref={targetRef} className="route-map-viewer__canvas" aria-label="路线轨迹预览地图" />
}

export default function RouteMapViewer({
  routePoints = [],
  height = '250px',
  compact = false,
}) {
  const coordinates = useMemo(
    () => convertRoutePointsToCoordinates(routePoints),
    [routePoints],
  )

  return (
    <div
      className={`route-map-viewer${compact ? ' route-map-viewer--compact' : ''}`}
      style={{ height }}
      data-route-points={coordinates.length}
    >
      {coordinates.length >= 2 ? (
        <RouteMapViewerCanvas coordinates={coordinates} compact={compact} />
      ) : (
        <div className="route-map-viewer__empty">
          <strong>暂无路线轨迹</strong>
          <span>请先编辑路线</span>
        </div>
      )}
    </div>
  )
}
