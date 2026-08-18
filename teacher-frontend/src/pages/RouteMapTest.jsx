import { useState } from 'react'
import RouteMap from '../components/map/RouteMap.jsx'

const testRoute = [
  { longitude: 114.2965, latitude: 30.5843, order_index: 0 },
  { longitude: 114.3108, latitude: 30.5928, order_index: 1 },
  { longitude: 114.3292, latitude: 30.6026, order_index: 2 },
]

const testPoints = [
  { id: 1, name: '东湖地质观察点', longitude: 114.3108, latitude: 30.5928, task: '辨认岩层', description: '记录岩性与产状。' },
]

const testObservations = [
  { id: 11, longitude: 114.321, latitude: 30.598, observation_text: '学生观察记录示例', photo_url: '' },
]

export default function RouteMapTest() {
  const [selected, setSelected] = useState(null)
  return (
    <div className="inner-page">
      <div className="page-title-row"><div><p>地图组件测试</p><h1>OpenLayers 基础地图</h1><span>OSM 底图 · 默认中心为武汉</span></div></div>
      <RouteMap routePath={testRoute} points={testPoints} studentObservations={testObservations} onPointClick={(item) => setSelected({ type: '观察点', item })} onObservationClick={(item) => setSelected({ type: '学生记录', item })} />
      {selected && <div className="map-test-result"><strong>{selected.type}</strong><span>{selected.item.name || selected.item.observation_text}</span></div>}
    </div>
  )
}
