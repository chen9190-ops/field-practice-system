import { useEffect, useRef, useState } from "react";
import { convertPathForAmap } from "../../utils/amapPathConversion";

export function StudentTrackPolyline({
  AMap,
  map,
  path,
  coordinateSystem,
  visible = true,
  onPolylineChange,
}) {
  const polylineRef = useRef(null);
  const callbackRef = useRef(onPolylineChange);
  const [convertedPath, setConvertedPath] = useState([]);

  callbackRef.current = onPolylineChange;

  useEffect(() => {
    let active = true;
    convertPathForAmap(AMap, path, coordinateSystem).then((nextPath) => {
      if (active) {
        setConvertedPath(nextPath);
      }
    });
    return () => {
      active = false;
    };
  }, [AMap, coordinateSystem, path]);

  useEffect(() => {
    if (!AMap || !map) {
      return undefined;
    }

    const polyline = new AMap.Polyline({
      path: [],
      strokeColor: "#E5922D",
      strokeWeight: 5,
      strokeOpacity: 0.95,
      strokeStyle: "dashed",
      strokeDasharray: [10, 7],
      lineJoin: "round",
      lineCap: "round",
      zIndex: 21,
    });
    polylineRef.current = polyline;
    map.add(polyline);

    return () => {
      callbackRef.current?.(null, 0);
      map.remove(polyline);
      polylineRef.current = null;
    };
  }, [AMap, map]);

  useEffect(() => {
    const polyline = polylineRef.current;
    if (!polyline) {
      return;
    }
    polyline.setPath(convertedPath);
    callbackRef.current?.(polyline, convertedPath.length);
  }, [convertedPath]);

  useEffect(() => {
    const polyline = polylineRef.current;
    if (!polyline) {
      return;
    }
    if (visible) {
      polyline.show();
    } else {
      polyline.hide();
    }
  }, [visible]);

  return null;
}
