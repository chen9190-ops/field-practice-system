const CONVERSION_BATCH_SIZE = 40;

function convertBatch(AMap, points) {
  return new Promise((resolve) => {
    AMap.convertFrom(points, "gps", (status, result) => {
      if (status !== "complete" || !Array.isArray(result?.locations)) {
        resolve([]);
        return;
      }
      resolve(result.locations.map((location) => [
        location.getLng(),
        location.getLat(),
      ]));
    });
  });
}

export async function convertCoordinatesForAmap(
  AMap,
  coordinates,
  coordinateSystem,
) {
  if (!AMap || !Array.isArray(coordinates) || coordinates.length === 0) {
    return [];
  }
  if (coordinateSystem === "GCJ02") {
    return coordinates;
  }
  if (coordinateSystem !== "WGS84") {
    return [];
  }

  const converted = [];
  for (let index = 0; index < coordinates.length; index += CONVERSION_BATCH_SIZE) {
    const batch = await convertBatch(
      AMap,
      coordinates.slice(index, index + CONVERSION_BATCH_SIZE),
    );
    if (batch.length === 0) {
      return [];
    }
    converted.push(...batch);
  }
  return converted;
}

export async function convertPathForAmap(AMap, path, coordinateSystem) {
  if (!AMap || !Array.isArray(path) || path.length < 2) {
    return [];
  }
  return convertCoordinatesForAmap(AMap, path, coordinateSystem);
}
