(function () {
  const ADDIS_BOUNDS = {
    minLat: 8.8,
    maxLat: 9.2,
    minLon: 38.6,
    maxLon: 39.05
  };

  function isInsideCoverage(lat, lon) {
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      return false;
    }

    return lat >= ADDIS_BOUNDS.minLat &&
      lat <= ADDIS_BOUNDS.maxLat &&
      lon >= ADDIS_BOUNDS.minLon &&
      lon <= ADDIS_BOUNDS.maxLon;
  }

  function getAddisLeafletBounds() {
    return [
      [ADDIS_BOUNDS.minLat, ADDIS_BOUNDS.minLon],
      [ADDIS_BOUNDS.maxLat, ADDIS_BOUNDS.maxLon]
    ];
  }

  window.WaytherCoverage = {
    ADDIS_BOUNDS,
    isInsideCoverage,
    getAddisLeafletBounds
  };
})();

