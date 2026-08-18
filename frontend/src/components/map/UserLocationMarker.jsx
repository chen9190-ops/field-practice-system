import { useEffect, useRef } from "react";
import "./UserLocationMarker.css";

export function UserLocationMarker({
  AMap,
  map,
  position,
  accuracy,
  heading,
}) {
  const markerRef = useRef(null);
  const markerElementRef = useRef(null);
  const markerAddedRef = useRef(false);
  const accuracyCircleRef = useRef(null);

  useEffect(() => {
    if (!AMap || !map) {
      return undefined;
    }

    const markerElement = document.createElement("div");
    markerElement.className = "user-location-marker";
    markerElement.innerHTML = `
      <div class="user-location-arrow"></div>
      <div class="user-location-center"></div>
    `;
    const marker = new AMap.Marker({
      content: markerElement,
      anchor: "center",
      offset: new AMap.Pixel(0, 0),
      zIndex: 100,
    });

    markerRef.current = marker;
    markerElementRef.current = markerElement;

    return () => {
      if (markerAddedRef.current) {
        map.remove(marker);
      }
      if (accuracyCircleRef.current) {
        map.remove(accuracyCircleRef.current);
      }
      markerRef.current = null;
      markerElementRef.current = null;
      markerAddedRef.current = false;
      accuracyCircleRef.current = null;
    };
  }, [AMap, map]);

  useEffect(() => {
    if (!AMap || !map || !position || !markerRef.current) {
      return;
    }

    markerRef.current.setPosition(position);
    if (!markerAddedRef.current) {
      map.add(markerRef.current);
      markerAddedRef.current = true;
    }

    if (Number.isFinite(heading)) {
      markerElementRef.current?.style.setProperty(
        "--heading",
        `${heading}deg`,
      );
    }

    if (!Number.isFinite(accuracy)) {
      return;
    }
    if (!accuracyCircleRef.current) {
      accuracyCircleRef.current = new AMap.Circle({
        center: position,
        radius: accuracy,
        fillColor: "#3B9FE5",
        fillOpacity: 0.13,
        strokeColor: "#2589D8",
        strokeOpacity: 0.36,
        strokeWeight: 1.5,
        zIndex: 40,
      });
      map.add(accuracyCircleRef.current);
      return;
    }
    accuracyCircleRef.current.setCenter(position);
    accuracyCircleRef.current.setRadius(accuracy);
  }, [AMap, accuracy, heading, map, position]);

  return null;
}
