import { describe, it, expect } from 'vitest';
import { environmentalApiClient } from '../services/environmentalApiClient';

describe('Environmental AI Client Integration', () => {
  it('fetches gridded historical analysis with descriptive statistics, seasonal breakdown, and climatology', async () => {
    const analysis = await environmentalApiClient.fetchAiAnalysis('gridded_historical', 'PM2.5');

    expect(analysis).toBeDefined();
    expect(analysis.pollutant).toBe('PM2.5');
    expect(analysis.unit).toBe('µg/m³');
    expect(analysis.data_kind).toBe('modelled');
    expect(analysis.stats.count).toBe(72);
    expect(analysis.stats.valid_count).toBe(72);
    expect(analysis.stats.null_count).toBe(0);
    expect(analysis.stats.mean).toBeGreaterThan(0);
    expect(analysis.stats.median).toBeGreaterThan(0);

    // 4 Indian meteorological seasons
    expect(analysis.seasonal_trends.length).toBe(4);
    const seasonNames = analysis.seasonal_trends.map((s) => s.season_name);
    expect(seasonNames).toContain('Winter');
    expect(seasonNames).toContain('Pre-Monsoon');
    expect(seasonNames).toContain('Monsoon');
    expect(seasonNames).toContain('Post-Monsoon');

    // 12 months climatology
    expect(analysis.climatology.length).toBe(12);
    expect(analysis.climatology[0].month).toBe(1);
    expect(analysis.climatology[0].historical_mean).toBeGreaterThan(0);

    // Standardized anomalies
    expect(analysis.recent_anomalies.length).toBeGreaterThan(0);
    expect(analysis.recent_anomalies[0].note).toContain('not an immediate health emergency');
  });

  it('fetches statutory ground snapshot analysis with measured data kind', async () => {
    const analysis = await environmentalApiClient.fetchAiAnalysis('ground_snapshot', 'PM2.5', undefined, true);

    expect(analysis).toBeDefined();
    expect(analysis.dataset_id).toBe('cpcb_snapshot_2026');
    expect(analysis.data_kind).toBe('measured');
    expect(analysis.stats.valid_count).toBeGreaterThan(0);
    expect(analysis.limitations.length).toBeGreaterThan(0);
  });

  it('fetches statistical monthly forecasts with held-out evaluation metrics and uncertainty bounds', async () => {
    const forecast = await environmentalApiClient.fetchAiForecast('PM2.5', undefined, 6);

    expect(forecast).toBeDefined();
    expect(forecast.pollutant).toBe('PM2.5');
    expect(forecast.data_kind).toBe('forecast');
    expect(forecast.forecast_resolution).toBe('monthly_mean');
    expect(forecast.horizon_months).toBe(6);
    expect(forecast.forecast_points.length).toBe(6);

    // Chronological evaluation metrics
    expect(forecast.evaluation.evaluation_type).toBe('chronological_train_test_split');
    expect(forecast.evaluation.train_period_range).toBe('2017-01 to 2021-12');
    expect(forecast.evaluation.test_period_range).toBe('2022-01 to 2022-12');
    expect(forecast.evaluation.test_observations).toBe(12);
    expect(forecast.evaluation.mae).toBeGreaterThan(0);
    expect(forecast.evaluation.rmse).toBeGreaterThan(0);

    // Uncertainty prediction intervals
    for (const pt of forecast.forecast_points) {
      expect(pt.lower_bound).toBeGreaterThanOrEqual(0);
      expect(pt.upper_bound).toBeGreaterThanOrEqual(pt.forecast_value);
      expect(pt.lower_bound).toBeLessThanOrEqual(pt.forecast_value);
      expect(pt.category).toBeDefined();
      expect(pt.color).toBeDefined();
    }

    // Critical non-hourly disclaimer
    expect(forecast.limitations.some((l) => l.includes('Cannot predict sub-monthly events'))).toBe(true);
  });

  it('fetches deterministic health risk advisory aligned with CPCB statutory standards', async () => {
    const advisory = await environmentalApiClient.fetchAiAdvisory('PM2.5', 115.0, '24_hour_mean', 'observed_ground');

    expect(advisory).toBeDefined();
    expect(advisory.pollutant).toBe('PM2.5');
    expect(advisory.concentration).toBe(115.0);
    expect(advisory.cpcb_category).toBe('Poor');
    expect(advisory.risk_level).toBe('high');
    expect(advisory.exceedance_status).toBe('exceeds_standard');
    expect(advisory.applicable_naaqs_standard).toBe(60.0);
    expect(advisory.general_public_advisory).toBeDefined();
    expect(advisory.sensitive_groups_guidance.length).toBeGreaterThanOrEqual(2);
    expect(advisory.disclaimer).toContain('do not constitute individual medical diagnoses');
  });

  it('flags unverified averaging period when comparing non-24h periods against statutory standards', async () => {
    const advisory = await environmentalApiClient.fetchAiAdvisory('PM2.5', 90.0, 'monthly_mean', 'modelled_gridded');

    expect(advisory.averaging_period).toBe('monthly_mean');
    expect(advisory.exceedance_status).toBe('unverified_averaging_period');
    expect(advisory.data_basis).toBe('modelled_gridded');
    expect(advisory.confidence_level).toBe('not_estimated');
  });

  it('evaluates all 3 averaging period selections with distinct data semantics and no hardcoded HIGH confidence', async () => {
    // 1. 24-Hour standard query (uses ground snapshot -> unverified period)
    const adv24 = await environmentalApiClient.fetchAiAdvisory('PM2.5', undefined, '24_hour_mean', 'observed_ground');
    expect(adv24.averaging_period).toBe('24_hour_mean');
    expect(adv24.exceedance_status).toBe('unverified_averaging_period');
    expect(adv24.data_basis).toBe('observed_ground');
    expect(adv24.confidence_level).toBe('not_estimated');
    expect(adv24.confidence_level).not.toBe('high');

    // 2. Monthly mean query (uses modelled gridded -> distinct monthly concentration)
    const advMonth = await environmentalApiClient.fetchAiAdvisory('PM2.5', undefined, 'monthly_mean', 'modelled_gridded');
    expect(advMonth.averaging_period).toBe('monthly_mean');
    expect(advMonth.data_basis).toBe('modelled_gridded');
    expect(advMonth.cpcb_category).toBe('Modelled Monthly Mean');
    expect(advMonth.exceedance_status).toBe('unverified_averaging_period');
    expect(advMonth.confidence_level).toBe('not_estimated');
    expect(advMonth.concentration).not.toBe(adv24.concentration);

    // 3. 1-Hour snapshot query
    const adv1h = await environmentalApiClient.fetchAiAdvisory('PM2.5', undefined, '1_hour_snapshot', 'observed_ground');
    expect(adv1h.averaging_period).toBe('1_hour_snapshot');
    expect(adv1h.exceedance_status).toBe('unverified_averaging_period');
    expect(adv1h.confidence_level).toBe('not_estimated');
  });
});
