import { useEffect } from "react";
import {
  markerAvailable,
  markerCompleted,
  markerLocked,
  markerRandom,
} from "../../assets/map-page";

const markerImages = {
  available: markerAvailable,
  completed: markerCompleted,
  locked: markerLocked,
};

export function ObservationMarkers({
  AMap,
  map,
  observations,
  selectedId,
  onSelect,
}) {
  useEffect(() => {
    if (!AMap || !map || observations.length === 0) {
      return undefined;
    }

    const markerEntries = observations.map((observation) => {
      const content = document.createElement("button");
      content.type = "button";
      content.className = [
        "observation-marker",
        `observation-marker--${observation.status}`,
        observation.id === selectedId ? "is-selected" : "",
      ].filter(Boolean).join(" ");
      content.setAttribute("aria-label", `${observation.code} ${observation.name}`);

      const image = document.createElement("img");
      image.src = observation.type === "random"
        ? markerRandom
        : markerImages[observation.status] || markerLocked;
      image.alt = "";
      image.setAttribute("aria-hidden", "true");

      const label = document.createElement("span");
      label.textContent = observation.code;

      content.append(image, label);

      const marker = new AMap.Marker({
        position: [observation.longitude, observation.latitude],
        content,
        offset: new AMap.Pixel(-23, -56),
        anchor: "bottom-center",
        zIndex: observation.id === selectedId ? 65 : 55,
      });
      const handleClick = () => onSelect(observation);
      marker.on("click", handleClick);

      return { marker, handleClick };
    });

    const markers = markerEntries.map(({ marker }) => marker);
    map.add(markers);

    return () => {
      markerEntries.forEach(({ marker, handleClick }) => {
        marker.off("click", handleClick);
      });
      map.remove(markers);
    };
  }, [AMap, map, observations, selectedId, onSelect]);

  return null;
}
