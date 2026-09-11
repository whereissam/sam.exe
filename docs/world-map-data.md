# World map data

The Memory Atlas is a stylized, walkable tabletop world map. It uses Natural Earth's public-domain 1:110m data, packaged locally so opening the map makes no third-party map requests.

- Coastlines: [Natural Earth land GeoJSON](https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_land.geojson).
- Country label coordinates and aliases: [Natural Earth countries GeoJSON](https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_countries.geojson), using `LABEL_X`, `LABEL_Y`, `NAME`, `NAME_EN`, `ADMIN` and `ISO_A2`.
- [Natural Earth terms of use](https://www.naturalearthdata.com/about/terms-of-use/): public domain.

Retrieved 2026-09-10. The source data is reduced into `components/world/world-land.json` (polygon rings, coordinates rounded to three decimals, Antarctica omitted for the tabletop composition) and `components/world/world-places.json` (name aliases mapped to label coordinates).

Projection: longitude / 9 along X; negative latitude / 9 along Z. This is an equirectangular illustration, not a navigation or territorial-boundary map. No country borders are drawn. A destination represents a country collection, not the precise place where every photo was taken.

Country groups come from each photo's explicit `country`, falling back to its linked travel journal. Unknown country names retain their photos and receive a position in the uncharted row at the bottom of the table; coordinates are never invented. Country aliases are used for positioning, but the catalog's original display names remain unchanged.

Visitors may walk over both land and ocean tiles. Small destination landmarks block movement, and routes avoid them. Country photo gardens keep photographs in their original proportions and retain demo labels and image credits.
