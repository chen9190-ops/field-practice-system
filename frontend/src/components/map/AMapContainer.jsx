import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react";
import AMapLoader from "@amap/amap-jsapi-loader";
import { calculateBearing } from "../../utils/mapBearing";

const CONVERSION_THROTTLE_MS = 5000;
const MIN_CONVERSION_DISTANCE_METERS = 3;

function getLocationErrorMessage(error) {
  if (!("geolocation" in navigator)) {
    return "当前浏览器不支持定位";
  }
  if (error?.code === 1) {
    return "定位权限被拒绝，请在浏览器设置中允许定位";
  }
  if (error?.code === 3) {
    return "定位超时，请稍后重试";
  }
  return "暂时无法获取位置，请点击定位按钮重试";
}

function convertGpsPosition(AMap, position) {
  return new Promise((resolve) => {
    AMap.convertFrom(position, "gps", (status, result) => {
      console.log("AMap.convertFrom status:", status);
      console.log("AMap.convertFrom result:", result);
      console.log("AMap.convertFrom result.info:", result?.info);
      console.log("AMap.convertFrom result.locations:", result?.locations);
      const converted = Array.isArray(result?.locations)
        ? result.locations[0]
        : result?.locations;
      if (status !== "complete" || !converted) {
        resolve(null);
        return;
      }
      resolve([converted.getLng(), converted.getLat()]);
    });
  });
}

function isClearlyMoreAccurate(nextAccuracy, previousAccuracy) {
  if (!Number.isFinite(nextAccuracy)) {
    return false;
  }
  if (!Number.isFinite(previousAccuracy)) {
    return true;
  }
  return (
    nextAccuracy <= previousAccuracy * 0.8
    || nextAccuracy <= previousAccuracy - 5
  );
}

export const AMapContainer = forwardRef(function AMapContainer({
  fallbackCenter,
  layerMode,
  onReady,
  onLocationStart,
  onLocationSuccess,
  onLocationError,
  onMapError,
}, ref) {
  const containerRef = useRef(null);
  const runtimeRef = useRef(null);
  const watchIdRef = useRef(null);
  const lastAcceptedRef = useRef(null);
  const lastConversionRef = useRef(null);
  const conversionSequenceRef = useRef(0);
  const resizeFrameRef = useRef(null);
  const callbackRef = useRef({
    onReady,
    onLocationStart,
    onLocationSuccess,
    onLocationError,
    onMapError,
  });

  callbackRef.current = {
    onReady,
    onLocationStart,
    onLocationSuccess,
    onLocationError,
    onMapError,
  };

  const startWatching = () => {
    if (watchIdRef.current !== null) {
      return;
    }
    if (!("geolocation" in navigator)) {
      callbackRef.current.onLocationError?.("当前浏览器不支持定位");
      return;
    }

    callbackRef.current.onLocationStart?.();
    watchIdRef.current = navigator.geolocation.watchPosition(
      (geolocationPosition) => {
        const runtime = runtimeRef.current;
        if (!runtime) {
          return;
        }

        const { coords } = geolocationPosition;
        console.log("geolocation longitude:", coords.longitude);
        console.log("geolocation latitude:", coords.latitude);
        console.log("geolocation accuracy:", coords.accuracy);
        const gpsPosition = [coords.longitude, coords.latitude];
        const accuracy = Number.isFinite(coords.accuracy)
          ? coords.accuracy
          : null;
        const now = Date.now();
        const previousConversion = lastConversionRef.current;
        if (
          previousConversion
          && now - previousConversion.timestamp < CONVERSION_THROTTLE_MS
        ) {
          return;
        }
        const distanceSinceConversion = previousConversion
          ? runtime.AMap.GeometryUtil.distance(
            previousConversion.gpsPosition,
            gpsPosition,
          )
          : Number.POSITIVE_INFINITY;
        if (
          distanceSinceConversion < MIN_CONVERSION_DISTANCE_METERS
          && !isClearlyMoreAccurate(accuracy, previousConversion?.accuracy)
        ) {
          return;
        }
        lastConversionRef.current = {
          gpsPosition,
          accuracy,
          timestamp: now,
        };
        const suppliedHeading = Number.isFinite(coords.heading)
          ? (coords.heading + 360) % 360
          : null;
        const conversionSequence = conversionSequenceRef.current + 1;
        conversionSequenceRef.current = conversionSequence;

        convertGpsPosition(runtime.AMap, gpsPosition).then((position) => {
          if (
            !position
            || conversionSequence !== conversionSequenceRef.current
          ) {
            if (!position) {
              callbackRef.current.onLocationError?.("定位坐标转换失败");
            }
            return;
          }

          const previous = lastAcceptedRef.current;
          const movedDistance = previous
            ? runtime.AMap.GeometryUtil.distance(previous.position, position)
            : Number.POSITIVE_INFINITY;
          const shouldAccept = (
            !previous
            || movedDistance > 3
            || isClearlyMoreAccurate(accuracy, previous.accuracy)
          );
          if (!shouldAccept) {
            return;
          }

          const derivedHeading = previous && movedDistance > 3
            ? calculateBearing(previous.gpsPosition, gpsPosition)
            : null;
          const heading = suppliedHeading
            ?? derivedHeading
            ?? previous?.heading
            ?? 0;
          const accepted = {
            gpsPosition,
            position,
            accuracy,
            heading,
          };
          const isFirstLocation = previous == null;
          lastAcceptedRef.current = accepted;

          if (isFirstLocation) {
            runtime.map.setZoomAndCenter(18, position, false, 500);
          }
          callbackRef.current.onLocationSuccess?.(accepted);
        });
      },
      (error) => {
        const runtime = runtimeRef.current;
        if (runtime && !lastAcceptedRef.current && fallbackCenter) {
          runtime.map.setZoomAndCenter(15, fallbackCenter, false, 500);
        }
        callbackRef.current.onLocationError?.(
          getLocationErrorMessage(error),
        );
      },
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 15000,
      },
    );
  };

  const locate = () => {
    const runtime = runtimeRef.current;
    const current = lastAcceptedRef.current;
    if (!runtime) {
      return;
    }
    if (current) {
      runtime.map.setZoomAndCenter(18, current.position, false, 500);
      return;
    }
    if (watchIdRef.current === null) {
      startWatching();
    } else {
      callbackRef.current.onLocationStart?.();
    }
  };

  useImperativeHandle(ref, () => ({
    locate,
    setZoomAndCenter(zoom, position) {
      runtimeRef.current?.map.setZoomAndCenter(zoom, position, false, 500);
    },
  }));

  useEffect(() => {
    const key = import.meta.env.VITE_AMAP_KEY;
    const securityCode = import.meta.env.VITE_AMAP_SECURITY_CODE;
    let disposed = false;

    if (!key || !securityCode) {
      callbackRef.current.onMapError?.("高德地图 Key 尚未配置");
      return undefined;
    }

    window._AMapSecurityConfig = {
      securityJsCode: securityCode,
    };

    AMapLoader.load({
      key,
      version: "2.0",
      plugins: [
        "AMap.Scale",
        "AMap.ToolBar",
        "AMap.ControlBar",
        "AMap.GeometryUtil",
      ],
    }).then((AMap) => {
      if (disposed || !containerRef.current) {
        return;
      }

      const map = new AMap.Map(containerRef.current, {
        viewMode: "3D",
        terrain: true,
        zoom: 15,
        pitch: 45,
        rotation: 0,
        resizeEnable: true,
        dragEnable: true,
        zoomEnable: true,
        rotateEnable: true,
        pitchEnable: true,
        showLabel: true,
      });

      map.addControl(new AMap.Scale());
      map.addControl(new AMap.ControlBar({
        position: { top: "92px", right: "14px" },
        showZoomBar: false,
      }));

      runtimeRef.current = { AMap, map };
      callbackRef.current.onReady?.({ AMap, map });
      resizeFrameRef.current = requestAnimationFrame(() => {
        resizeFrameRef.current = null;
        if (!disposed) {
          map.resize();
        }
      });
      startWatching();
    }).catch(() => {
      callbackRef.current.onMapError?.("高德地图加载失败，请检查 Key 和网络连接");
    });

    return () => {
      disposed = true;
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      if (resizeFrameRef.current !== null) {
        cancelAnimationFrame(resizeFrameRef.current);
        resizeFrameRef.current = null;
      }
      conversionSequenceRef.current += 1;
      lastAcceptedRef.current = null;
      lastConversionRef.current = null;
      const map = runtimeRef.current?.map;
      runtimeRef.current = null;

      // Overlay components remove their Marker/Polyline/Circle instances in
      // the same React cleanup pass. Destroy the map after those cleanups so
      // they never call map.remove() on an already-destroyed instance.
      if (map) {
        queueMicrotask(() => {
          map.destroy();
        });
      }
    };
  }, []);

  useEffect(() => {
    const handleResize = () => {
      runtimeRef.current?.map.resize();
    };

    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  useEffect(() => {
    const runtime = runtimeRef.current;
    if (!runtime) {
      return;
    }

    const { AMap, map } = runtime;
    if (layerMode === "satellite") {
      map.setLayers([
        new AMap.TileLayer.Satellite(),
        new AMap.TileLayer.RoadNet(),
      ]);
      return;
    }

    map.setLayers([new AMap.TileLayer()]);
    map.setPitch(45);
  }, [layerMode]);

  return <div ref={containerRef} className="amap-container" aria-label="地形地图" />;
});
