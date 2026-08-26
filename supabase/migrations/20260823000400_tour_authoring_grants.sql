-- Owners author tours through the API, so the application role needs to write
-- the tour row itself — not just the scenes hanging off it. Still no DELETE:
-- removing a tour is not something the product does, and a scene is removed by
-- deleting the scene.
grant insert, update on virtual_tours to rental_app;

-- A room can be removed while authoring — unlike an occupancy or a ledger
-- entry, an unwanted panorama is not a record of anything. The ON DELETE
-- RESTRICT on hotspots still refuses to leave a dangling door behind.
grant delete on tour_scenes to rental_app;
