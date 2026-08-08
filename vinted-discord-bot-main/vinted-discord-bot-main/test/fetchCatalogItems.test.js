import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCatalogItemsQueryParams } from '../src/api/fetchCatalogItems.js';

test('buildCatalogItemsQueryParams copies search parameters and defaults to top 20', () => {
  const params = buildCatalogItemsQueryParams({
    url: 'https://www.vinted.fr/catalog?search_text=robe&brand_ids[]=123&brand_ids[]=456&price_from=10&price_to=50',
    per_page: 20,
    order: 'newest_first'
  });

  assert.equal(params.get('search_text'), 'robe');
  assert.deepEqual(params.getAll('brand_ids[]'), ['123', '456']);
  assert.equal(params.get('price_from'), '10');
  assert.equal(params.get('price_to'), '50');
  assert.equal(params.get('per_page'), '20');
  assert.equal(params.get('order'), 'newest_first');
});

test('buildCatalogItemsQueryParams uses the URL order when no explicit order is provided', () => {
  const params = buildCatalogItemsQueryParams({
    url: 'https://www.vinted.fr/catalog?search_text=chaussure&order=price_low_to_high',
    per_page: 20
  });

  assert.equal(params.get('search_text'), 'chaussure');
  assert.equal(params.get('order'), 'price_low_to_high');
  assert.equal(params.get('per_page'), '20');
});
