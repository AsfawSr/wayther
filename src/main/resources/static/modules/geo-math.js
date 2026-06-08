(function () {
  function toRad(deg) {
    return (deg * Math.PI) / 180;
  }

  function toDeg(rad) {
    return (rad * 180) / Math.PI;
  }

  function normalizeHeading(value) {
    const n = Number.isFinite(value) ? value : 0;
    return ((n % 360) + 360) % 360;
  }

  function normalizeLongitude(value) {
    return ((value + 540) % 360) - 180;
  }

  function projectCoordinate(latDeg, lonDeg, bearingDeg, distanceKm) {
    const radiusKm = 6371;
    const lat1 = toRad(latDeg);
    const lon1 = toRad(lonDeg);
    const brng = toRad(normalizeHeading(bearingDeg));
    const dOverR = distanceKm / radiusKm;

    const lat2 = Math.asin(
      Math.sin(lat1) * Math.cos(dOverR) +
      Math.cos(lat1) * Math.sin(dOverR) * Math.cos(brng)
    );

    const lon2 = lon1 + Math.atan2(
      Math.sin(brng) * Math.sin(dOverR) * Math.cos(lat1),
      Math.cos(dOverR) - Math.sin(lat1) * Math.sin(lat2)
    );

    return {
      lat: toDeg(lat2),
      lon: normalizeLongitude(toDeg(lon2))
    };
  }

  function distanceMeters(lat1, lon1, lat2, lon2) {
    const radiusM = 6371000;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const aa =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(aa), Math.sqrt(1 - aa));
    return radiusM * c;
  }

  window.WaytherGeoMath = {
    toRad,
    toDeg,
    normalizeHeading,
    normalizeLongitude,
    projectCoordinate,
    distanceMeters
  };
})();

