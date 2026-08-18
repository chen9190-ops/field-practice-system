const ELEVATION_API_URL = "https://api.open-meteo.com/v1/elevation";
const MAX_POINTS_PER_REQUEST = 100;

export async function getElevations(points) {
  if (!Array.isArray(points)) throw new Error("INVALID_ELEVATION_POINTS");

  const normalizedPoints = points.map((point) => {
    const latitude = Number(point?.latitude);
    const longitude = Number(point?.longitude);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      throw new Error("INVALID_COORDINATES");
    }
    return { latitude, longitude };
  });
  if (normalizedPoints.length === 0) return [];

  const batches = [];
  for (let index = 0; index < normalizedPoints.length; index += MAX_POINTS_PER_REQUEST) {
    batches.push(normalizedPoints.slice(index, index + MAX_POINTS_PER_REQUEST));
  }

  const results = await Promise.all(batches.map(async (batch) => {
    const params = new URLSearchParams({
      latitude: batch.map((point) => point.latitude).join(","),
      longitude: batch.map((point) => point.longitude).join(","),
    });
    const response = await fetch(`${ELEVATION_API_URL}?${params.toString()}`);
    if (!response.ok) throw new Error("ELEVATION_REQUEST_FAILED");

    const data = await response.json();
    if (!Array.isArray(data?.elevation) || data.elevation.length !== batch.length) {
      throw new Error("INVALID_ELEVATION_RESPONSE");
    }

    return batch.map((point, index) => {
      const elevation = Number(data.elevation[index]);
      if (!Number.isFinite(elevation)) throw new Error("INVALID_ELEVATION_RESPONSE");
      return { ...point, elevation };
    });
  }));

  return results.flat();
}

export async function getElevation(latitude, longitude) {
  const [result] = await getElevations([{ latitude, longitude }]);
  return { elevation: result.elevation };
}
