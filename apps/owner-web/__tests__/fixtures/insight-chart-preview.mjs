import * as echarts from 'echarts/core';
import { LineChart } from 'echarts/charts';
import { GridComponent } from 'echarts/components';
import { SVGRenderer } from 'echarts/renderers';
import { insightColors } from '../../components/owner/insight-palette.ts';
import { sparklineOption } from '../../components/owner/sparkline-option.ts';

echarts.use([LineChart, GridComponent, SVGRenderer]);
export const styleSeries = [
  {id:'occupancy', values:[4,9,15,14,20,19,29,27]},
  {id:'bookings', values:[3,7,12,19,14,18,29,26]},
  {id:'earnings', values:[5,10,16,20,15,20,31,28]},
  {id:'views', values:[4,12,10,19,16,12,27,25]},
];

export function renderChart(values, color) {
  const instance = echarts.init(null, null, {renderer:'svg',ssr:true,width:220,height:104});
  try {
    instance.setOption(sparklineOption(values,color));
    return instance.renderToSVGString();
  } finally { instance.dispose(); }
}

export function chartPreviewHtml() {
  return `<html><head><style>body{margin:0;padding:24px;background:#f3f8fc;color:#081e46;font:14px Arial}h1{font-size:18px}main{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}article{padding:16px;background:white;border:1px solid #eaf0f7;border-radius:14px}svg{display:block;width:100%;height:auto}p{color:#697ba7}</style></head><body><h1>Graph style validation</h1><p>Synthetic test series · shared production ECharts configuration · no production metrics</p><main>${styleSeries.map(series=>`<article><span>${series.id}</span>${renderChart(series.values,insightColors[series.id])}</article>`).join('')}</main></body></html>`;
}
