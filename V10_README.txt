# MathsEra Classes V10 — Professional Educational Website

This build preserves the existing MathsEra Universal Solution Portal and adds a future-ready public CMS structure.

## Public sections
Home, Courses, Batches, Fees, Study Material/Solutions, Test Series (existing portal), Results & Achievers, Events & Competitions, Announcements, Posters/Advertisements, Gallery, About, Contact/Social.

## Admin ownership
Students/public users are read-only. Only a Supabase Auth user whose UUID exists in `public.admin_profiles` with `is_admin=true` can create, edit, delete, publish or unpublish CMS records.

## One-time Supabase setup
1. Keep the existing `supabase-schema.sql` for the resources/solutions system.
2. Run `supabase-v10-professional-schema.sql`.
3. Create your own Supabase Auth account (email + password).
4. Copy that Auth user's UUID and run the final INSERT shown at the bottom of `supabase-v10-professional-schema.sql`.
5. Do NOT put a service-role key in frontend files.
6. Test admin login at `admin.html`.

## Important
The current `supabase-config.js` contains a publishable/anon key. That key is intended for frontend use, but RLS is what protects the data. Never replace it with a service-role/secret key.

## Content flow
Admin: Create -> Draft/Published -> Edit -> Publish/Unpublish -> Delete.
Public: only published content is readable.

## Student results / photos
Before publishing student photographs or personal result details, obtain the appropriate permission/consent and publish only information that is appropriate for the website.

## Existing solution portal
`library.html`, `solution.html`, `resource.html`, `admin.html` and their existing scripts remain part of the build. The V10 admin currently provides management for the new CMS tables; use the existing solution editor for detailed solution/image/PDF workflows.

## Detailed solution editor
Use `solution-admin.html` from the admin dashboard for the existing detailed solution workflow: multiple solution images, image reorder/remove, PDF/ZIP downloads, KaTeX solution fields, preview, edit and delete.

## Fix for "account is not authorised"
Run `supabase-owner-bootstrap.sql` once in Supabase SQL Editor. It creates a locked-down one-time RPC for the authorised owner email already configured for this MathsEra build. Then login again at `admin.html`; the account will be promoted automatically only if no admin exists yet.

## V10 media uploader correction
The Admin CMS now uses direct device file selection for student photos, event posters, advertisements, and gallery photos instead of URL-entry fields. Multiple image selection is supported; Gallery and Posters bulk-create one CMS record per selected image. For single-record Result/Event entries, if multiple files are selected, the first selected image is attached to that record.


## V11 banner/media upgrade
The Posters / Ads manager now supports homepage carousel placement, display order, auto-slide/manual swipe mode, slide duration, and an optional mobile-specific image. These controls are stored inside the existing `description` field as a versioned JSON metadata object, so no new SQL migration is required.

Recommended artwork:
- Desktop banner: 1600×600 px (8:3)
- Mobile banner: 1080×675 px (8:5)
- Student/result portrait: around 1000×1200 px (5:6)

Homepage placements:
- Homepage — Top Banner
- Homepage — After Quick Access
- Homepage — Results Area
- Homepage — Before Footer
- Posters Page Only
- Homepage + Posters Page

Existing legacy poster records remain readable and default to the Homepage Top placement.
