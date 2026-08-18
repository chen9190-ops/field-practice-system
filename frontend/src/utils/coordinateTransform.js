const PI = Math.PI;
const AXIS = 6378245;
const ECCENTRICITY_SQUARED = 0.006693421622965943;

function isOutsideChina(longitude, latitude) {
  return (
    longitude < 72.004
    || longitude > 137.8347
    || latitude < 0.8293
    || latitude > 55.8271
  );
}

function transformLatitude(longitude, latitude) {
  let result = -100 + (2 * longitude) + (3 * latitude);
  result += (0.2 * latitude * latitude) + (0.1 * longitude * latitude);
  result += 0.2 * Math.sqrt(Math.abs(longitude));
  result += (
    (20 * Math.sin(6 * longitude * PI))
    + (20 * Math.sin(2 * longitude * PI))
  ) * 2 / 3;
  result += (
    (20 * Math.sin(latitude * PI))
    + (40 * Math.sin(latitude / 3 * PI))
  ) * 2 / 3;
  result += (
    (160 * Math.sin(latitude / 12 * PI))
    + (320 * Math.sin(latitude * PI / 30))
  ) * 2 / 3;
  return result;
}

function transformLongitude(longitude, latitude) {
  let result = 300 + longitude + (2 * latitude);
  result += (0.1 * longitude * longitude) + (0.1 * longitude * latitude);
  result += 0.1 * Math.sqrt(Math.abs(longitude));
  result += (
    (20 * Math.sin(6 * longitude * PI))
    + (20 * Math.sin(2 * longitude * PI))
  ) * 2 / 3;
  result += (
    (20 * Math.sin(longitude * PI))
    + (40 * Math.sin(longitude / 3 * PI))
  ) * 2 / 3;
  result += (
    (150 * Math.sin(longitude / 12 * PI))
    + (300 * Math.sin(longitude / 30 * PI))
  ) * 2 / 3;
  return result;
}

export function wgs84ToGcj02(longitude, latitude) {
  const lng = Number(longitude);
  const lat = Number(latitude);

  if (!Number.isFinite(lng) || !Number.isFinite(lat)) {
    return null;
  }

  if (isOutsideChina(lng, lat)) {
    return [lng, lat];
  }

  let latitudeOffset = transformLatitude(lng - 105, lat - 35);
  let longitudeOffset = transformLongitude(lng - 105, lat - 35);
  const radianLatitude = lat / 180 * PI;
  let magic = Math.sin(radianLatitude);
  magic = 1 - (ECCENTRICITY_SQUARED * magic * magic);
  const squareRootMagic = Math.sqrt(magic);

  latitudeOffset = (
    latitudeOffset * 180
  ) / (
    (AXIS * (1 - ECCENTRICITY_SQUARED))
    / (magic * squareRootMagic)
    * PI
  );
  longitudeOffset = (
    longitudeOffset * 180
  ) / (
    AXIS / squareRootMagic
    * Math.cos(radianLatitude)
    * PI
  );

  return [lng + longitudeOffset, lat + latitudeOffset];
}

export function toAmapCoordinate(longitude, latitude, source = "") {
  const coordinateSystem = String(source).toUpperCase().replace("-", "");
  const lng = Number(longitude);
  const lat = Number(latitude);

  if (!Number.isFinite(lng) || !Number.isFinite(lat)) {
    return null;
  }

  if (coordinateSystem === "GCJ02") {
    return [lng, lat];
  }

  if (coordinateSystem === "WGS84" || coordinateSystem === "GPS") {
    return wgs84ToGcj02(lng, lat);
  }

  return null;
}
