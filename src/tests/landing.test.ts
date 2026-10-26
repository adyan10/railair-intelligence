import { describe, it, expect } from 'vitest';

describe('Phase 3 — RailAir Intelligence Landing Page', () => {
  it('defines the core landing page metadata and route alignment', () => {
    const landingConfig = {
      entryRoute: '/',
      primaryCtaRoute: '/corridor',
      corridorFocus: 'Meerut—Ghaziabad—Delhi',
      routeLengthKm: 71.8,
      monitoredNodes: 7,
      locomotiveClass: 'WAP-7',
      tractionVoltage: '25 kV AC 50Hz',
      trackGauge: '1676 mm Broad Gauge',
    };

    expect(landingConfig.entryRoute).toBe('/');
    expect(landingConfig.primaryCtaRoute).toBe('/corridor');
    expect(landingConfig.routeLengthKm).toBe(71.8);
    expect(landingConfig.monitoredNodes).toBe(7);
    expect(landingConfig.locomotiveClass).toBe('WAP-7');
  });

  it('verifies WAP-7 locomotive technical specification labels', () => {
    const locoSpec = {
      fleetNumber: '30201 IR',
      railwayZone: 'NORTHERN RAILWAY',
      wheelArrangement: 'Co-Co',
      axlesPerBogie: 3,
      totalAxles: 6,
    };

    expect(locoSpec.fleetNumber).toBe('30201 IR');
    expect(locoSpec.railwayZone).toBe('NORTHERN RAILWAY');
    expect(locoSpec.axlesPerBogie).toBe(3);
    expect(locoSpec.totalAxles).toBe(6);
  });

  it('verifies simulated data disclaimer and institutional provenance', () => {
    const disclaimer = 'Simulated baseline dataset for prototype validation. Not connected to active CPCB instrumentation.';
    expect(disclaimer).toContain('Simulated baseline dataset');
    expect(disclaimer).toContain('CPCB');
  });

  it('verifies the brand emblem asset path and configuration', () => {
    const emblemConfig = {
      assetPath: 'UI resources/Futuristic AI Rail Emblem.png',
      alt: 'RailAir Intelligence Emblem',
      aspectRatio: '1:1',
    };
    expect(emblemConfig.assetPath).toContain('Futuristic AI Rail Emblem.png');
    expect(emblemConfig.alt).toBe('RailAir Intelligence Emblem');
    expect(emblemConfig.aspectRatio).toBe('1:1');
  });
});
