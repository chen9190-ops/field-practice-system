import faultData from "../data/geology/faults.json";
import lithologyData from "../data/geology/lithology.json";
import stratigraphyData from "../data/geology/stratigraphy.json";

export async function getLithologyData() {
  return lithologyData;
}

export async function getStratigraphyData() {
  return stratigraphyData;
}

export async function getFaultData() {
  return faultData;
}

// Future data providers can replace these local imports with GeoJSON URLs,
// WMS services, or XYZ tiles without moving data-loading logic into the map.
