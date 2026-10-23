import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadSource } from './helpers/load-store.mjs';
const {selectProperties,DEFAULT_PROPERTY_FILTERS:defaults} = loadSource('domain/listings/property-filters.ts');
const rows = [
  {id:'a',title:'Garden home',propertyName:'Home',areaLabel:'Lahug',cityLabel:'Cebu City',propertyType:'HOUSE',state:'PUBLISHED',intent:'RENT',priceCentavos:20000,updatedAt:'2026-10-01',activity:{views:3}},
  {id:'b',title:'Bay condo',propertyName:'Bay',areaLabel:'Bajada',cityLabel:'Davao City',propertyType:'CONDO',state:'DRAFT',intent:'RENT',priceCentavos:10000,updatedAt:'2026-10-02',activity:{views:12}},
  {id:'c',title:'City condo',propertyName:'City',areaLabel:'Luz',cityLabel:'Cebu City',propertyType:'CONDO',state:'PUBLISHED',intent:'SALE',priceCentavos:1,updatedAt:null,activity:null},
];

test('property query composes location, type, status and text filters', () => {
  assert.deepEqual(selectProperties(rows,'PUBLISHED','Luz',{...defaults,location:'Cebu City',propertyType:'CONDO'}).map(r=>r.id),['c']);
  assert.equal(selectProperties(rows,'ALL','',{...defaults,location:'Davao City',propertyType:'HOUSE'}).length,0);
});
test('property sorting uses actual activity and never sorts sale rows by private prices', () => {
  assert.deepEqual(selectProperties(rows,'ALL','',{...defaults,sort:'VIEWS'}).map(r=>r.id),['b','a','c']);
  assert.deepEqual(selectProperties(rows,'ALL','',{...defaults,sort:'PRICE_ASC'}).map(r=>r.id),['b','a','c']);
  assert.deepEqual(selectProperties(rows,'ALL','',{...defaults,sort:'PRICE_DESC'}).map(r=>r.id),['a','b','c']);
});
test('property sorting handles missing dates and preserves repository input order', () => {
  assert.deepEqual(selectProperties(rows,'ALL','',defaults).map(r=>r.id),['b','a','c']);
  assert.deepEqual(selectProperties(rows,'ALL','',{...defaults,sort:'TITLE'}).map(r=>r.id),['b','c','a']);
  assert.deepEqual(rows.map(r=>r.id),['a','b','c']);
});
