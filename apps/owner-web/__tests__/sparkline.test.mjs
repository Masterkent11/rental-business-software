import { test } from 'node:test';
import assert from 'node:assert/strict';
import { insightColors } from '../components/owner/insight-palette.ts';
import { sparklineOption } from '../components/owner/sparkline-option.ts';
import { renderChart, styleSeries } from './fixtures/insight-chart-preview.mjs';

test('sparkline preserves chronological values and renders smooth gradient areas in each reference color', () => {
  for (const series of styleSeries) {
    const input = [...series.values];
    const option = sparklineOption(input, insightColors[series.id]);
    assert.deepEqual(option.series[0].data, series.values);
    assert.deepEqual(input, series.values);
    assert.equal(option.series[0].smooth, 0.45);
    assert.equal(option.series[0].lineStyle.width, 2);
    const svg = renderChart(input, insightColors[series.id]);
    assert.match(svg, /linearGradient/);
    assert.match(svg, /stop-opacity="0.48"/);
    assert.match(svg, /stop-opacity="0"/);
    assert.match(svg, /C[\d. -]/);
    assert.ok(svg.includes(insightColors[series.id]));
  }
});

test('zero and sparse data remain finite and all chart decoration and animation stays disabled', () => {
  for (const values of [[], [0], [0,0,0], [7]]) {
    const option = sparklineOption(values, insightColors.bookings);
    assert.deepEqual(option.series[0].data, values);
    assert.ok(Number.isFinite(option.yAxis.max));
    assert.equal(option.animation, false);
    assert.equal(option.xAxis.show, false);
    assert.equal(option.yAxis.show, false);
    assert.equal(option.series[0].showSymbol, false);
    assert.equal(option.tooltip, undefined);
    assert.doesNotMatch(renderChart(values,insightColors.bookings), /NaN|Infinity/);
  }
});
