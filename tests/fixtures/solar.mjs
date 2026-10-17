// Entirely synthetic coordinates, geometry and production. No Google response.
export function solarFixture() {
  return {
    center: { latitude: 15, longitude: 79 },
    boundingBox: {
      sw: { latitude: 14.999, longitude: 78.999 },
      ne: { latitude: 15.001, longitude: 79.001 },
    },
    imageryDate: { year: 2021, month: 3, day: 2 },
    imageryProcessedDate: { year: 2025, month: 2, day: 1 },
    imageryQuality: 'BASE',
    solarPotential: {
      panelCapacityWatts: 400,
      panelHeightMeters: 2,
      panelWidthMeters: 1,
      roofSegmentStats: [{ pitchDegrees: 30, azimuthDegrees: 180 }],
      solarPanels: Array.from({ length: 8 }, (_, i) => ({
        center: { latitude: 15 + i * 0.00002, longitude: 79 },
        orientation: i % 2 ? 'LANDSCAPE' : 'PORTRAIT',
        segmentIndex: 0,
        yearlyEnergyDcKwh: 600,
      })),
      solarPanelConfigs: [
        { panelsCount: 4, yearlyEnergyDcKwh: 2400 },
        { panelsCount: 8, yearlyEnergyDcKwh: 4800 },
      ],
      financialAnalyses: [{ privateUnusedField: 'MUST_NOT_ESCAPE' }],
    },
  };
}
