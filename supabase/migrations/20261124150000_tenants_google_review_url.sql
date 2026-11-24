-- Operator's Google Business Profile review link. After a happy (4–5★) direct
-- customer submits the internal review form, the thank-you screen offers a
-- "Post it on Google" button. Read server-side with the admin client only —
-- no anon column grant needed.
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS google_review_url text;
