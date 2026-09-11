-- Review photos need to be visible to every site visitor, signed in or not —
-- that's the whole point of showing them as social proof on a product page.
-- The review-images bucket was correctly kept private (workspace policy
-- disallows public=true buckets), but the read policy was scoped to
-- `authenticated` only, which also excludes anonymous visitors from
-- generating a signed URL for a photo. Widening to `anon, authenticated`
-- fixes that without touching the bucket's private flag: every visitor's
-- browser already carries the anon key (signed in or not), so this achieves
-- the same "visible to everyone" outcome as a public bucket while every
-- actual image URL served is still a short-lived signed link, not a bare
-- public one.
ALTER POLICY "Anyone can view review images" ON storage.objects
  TO anon, authenticated;
