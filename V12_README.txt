MathsEra Classes V12 - Banner Carousel Final Fixed

This version keeps banner carousel metadata inside the existing `posters.description`
field as JSON. It does NOT require new Supabase columns or SQL migrations.
The admin script is renamed to admin-v11.js to avoid stale browser cache.


Patch 2026-08-16: Admin poster save now builds an explicit payload containing only real
posters table columns, eliminating any possibility of display_order/placement/etc.
being sent as Supabase columns. Admin JS cache version was also bumped.
