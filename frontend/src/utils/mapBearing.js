const TO_RADIANS = Math.PI / 180;
const TO_DEGREES = 180 / Math.PI;

export function calculateBearing(previousPosition, currentPosition) {
  if (!previousPosition || !currentPosition) {
    return null;
  }

  const [previousLongitude, previousLatitude] = previousPosition.map(Number);
  const [currentLongitude, currentLatitude] = currentPosition.map(Number);
  if (
    !Number.isFinite(previousLongitude)
    || !Number.isFinite(previousLatitude)
    || !Number.isFinite(currentLongitude)
    || !Number.isFinite(currentLatitude)
  ) {
    return null;
  }

  const latitude1 = previousLatitude * TO_RADIANS;
  const latitude2 = currentLatitude * TO_RADIANS;
  const longitudeDelta = (
    currentLongitude - previousLongitude
  ) * TO_RADIANS;
  const y = Math.sin(longitudeDelta) * Math.cos(latitude2);
  const x = (
    Math.cos(latitude1) * Math.sin(latitude2)
    - Math.sin(latitude1)
    * Math.cos(latitude2)
    * Math.cos(longitudeDelta)
  );

  return (Math.atan2(y, x) * TO_DEGREES + 360) % 360;
}
