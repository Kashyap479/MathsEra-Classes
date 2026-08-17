MATHSERA CLASSES — UNIVERSAL LEARNING LIBRARY + SOLUTION PORTAL
===============================================================

This build is designed around one canonical rule:

    Published content must always remain discoverable in the exact library
    determined by its Exam Category + Exam Name + Class + Board + Subject.

No hard-coded student folders are required. The public library is generated
from published database content.

FILES
-----
index.html          Main website entry
library.html        Dynamic student-facing library
library.js          Library navigation, filters, history and taxonomy
resource.html       Dynamic page for general materials
resource.js         Gallery/download/back navigation for general materials
solution.html       Dynamic digital Mathematics solution page
solution.js         KaTeX solution renderer, gallery, downloads, pager
admin.html          Admin login + publisher + preview/edit/delete
admin.js            Admin CMS logic
supabase-config.js  Supabase project configuration
supabase-schema.sql Database + storage migration
styles.css          Main site styling

CORE CONTENT ARCHITECTURE
-------------------------
Exam Category
  -> Exam / Board / Exam Body
    -> Class / Level
      -> Subject
        -> Publication / Book (ONLY where the material actually depends on a book)
          -> Material Type
            -> Chapter / Topic
              -> Exercise / Paper / Set
                -> Question / Resource

PUBLICATION RULE
----------------
1. Exercise Solutions: Publication / Book is REQUIRED.
   Example:
   CBSE -> Class 11 -> Mathematics -> NCERT -> Exercise Solutions -> Chapter 3 -> Exercise 3.2 -> Q6

2. General materials such as Notes, PYQs, Practice Sets, Formula Sheets,
   Study Material etc. do NOT create a fake publication folder.
   Example:
   CBSE -> Class 11 -> Mathematics -> Notes -> Trigonometric Functions

3. If an admin accidentally fills a publication for a general material,
   the student-facing navigation still stays simple: material type first.
   Publication remains metadata/searchable information, not a confusing folder.

4. More books can be added later without changing the library code:
   NCERT, NCERT Exemplar, RD Sharma, R.S. Aggarwal, UP Board/SCERT,
   local/state publications, and future books.

SUPPORTED EXAM CATEGORIES
--------------------------
Board Exams
JEE
NEET
NDA
CUET
TET
NET
Other Competitive
School / General

These are intentionally kept in the taxonomy so future content is not lost or
forced into the wrong section.

MATERIAL TYPES
--------------
Syllabus
Exam Pattern
PYQs
PYQ Solutions
Exercise Solutions
Notes
Important Questions
Practice Sets
Sample Papers
Chapter-wise Questions
Previous Year Analysis
Formula Sheet
Study Material
Other Resources

SOLUTION PORTAL
---------------
Exercise Solutions and PYQ Solutions open in solution.html.
The page supports:
- Question
- Given / Concept
- Formula
- Step-by-step solution
- Final Answer
- Teacher's Tip / Important Note
- KaTeX mathematical rendering
- Solution image gallery
- Exact image page ordering
- Swipe left/right on mobile
- Previous/Next Question
- Individual image download
- Download all images as ZIP
- PDF open/download
- Exact-library backlink
- Browser back navigation
- SEO title, description and canonical URL

LATEX INPUT
-----------
For best mixed text + mathematics rendering use:

Inline:  $x^2 + 1$
Display: $$x^2 + 1 = 0$$

Also supported in solution fields:
\\(...\\) and \\[...\\]

Pure mathematical input such as \\frac{a}{b}, \\sqrt{x}, x^2, \\pi etc.
is automatically rendered when appropriate.

IMAGE / PDF ORDER
-----------------
The admin publisher preserves the selected page order. Existing pages can be
reordered during edit. Students see the same order, with Previous/Next and
swipe navigation.

DOWNLOADS
---------
Students can download the current image, all solution images as a ZIP, and
attached PDF files. If a browser blocks a cross-origin blob download, the site
falls back to opening the original public file URL.

ADMIN CMS
---------
Admin can:
- Login
- Publish
- Preview before publishing
- Edit existing material
- Delete published material
- Reorder image pages
- Remove old pages during edit
- Replace PDF
- Enter structured solution text
- Add SEO title/description
- Add publication only when needed

DATABASE COMPATIBILITY
----------------------
The canonical taxonomy is stored inside `resources.body` as JSON. Publication
is mirrored into the `publication` database column when that column exists.
Admin also contains a fallback for older databases where that column has not
yet been added.

RUN THE SQL MIGRATION
---------------------
In Supabase SQL Editor, run the complete `supabase-schema.sql` file once.
It is written as a migration and uses IF NOT EXISTS / policy replacement so
existing resources are preserved.

STORAGE
-------
The migration creates a public `library-files` bucket with:
- public read access
- authenticated upload
- authenticated update
- authenticated delete

SECURITY NOTE
-------------
The included policies allow authenticated users to manage resources. For a
single-teacher private admin account this is practical. If multiple admin
accounts are added later, replace the authenticated write policies with an
admin-users/role policy.

BROWSER BACK NAVIGATION
-----------------------
The library uses URL hash history for its modal navigation. Opening an exam,
class, subject, publication or material type creates a browser history entry.
Therefore Back moves one library level at a time instead of jumping straight
to the homepage.

The solution/resource pages also have an exact-library backlink and use the
browser history when opened from another same-origin page.

TESTING CHECKLIST
-----------------
Before deployment verify:
1. Home loads.
2. Library loads published content.
3. Every exam category opens.
4. Empty categories do not create fake folders.
5. Exercise Solutions require Publication.
6. Notes do not require Publication.
7. Multiple books remain separate.
8. Images preserve page order.
9. Swipe works on mobile.
10. Previous/Next Question stays inside the same exercise context.
11. Current image downloads.
12. All-images ZIP downloads.
13. PDF opens and downloads.
14. Browser Back moves one level at a time in Library.
15. Admin Preview works.
16. Admin Edit works.
17. Admin Delete works.
18. Existing legacy resources remain visible.
19. A failed database refresh does not leave an endless Loading screen.
20. Supabase RLS/storage policies are installed.

IMPORTANT LIMIT
---------------
This is a static GitHub Pages + Supabase architecture. It is fully dynamic for
students/admin, but Google SEO is still subject to search-engine JavaScript
rendering. For maximum SEO in the future, a server-side/static-generation layer
can be added without changing the underlying taxonomy.

SOCIAL/CONTACT INTEGRATION: Official links are centralized in social-config.js. Homepage social cards, mobile links, footer, contact page and mobile quick actions all use this single configuration.


PUBLICATION / NCERT FINAL FIX:
- Library uses public.resources.publication as the primary Publication/Book field.
- Legacy body taxonomy remains supported.
- Library cache key was bumped so old cached records cannot hide the new publication field.
- Existing materials are not deleted.
- Supabase publication column must exist; the supplied SQL fix adds it.
