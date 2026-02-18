-- Update all form templates to include chris@crowdit.com.au as notification user

-- Update forms that have null or empty settings
UPDATE form_templates
SET settings = jsonb_build_object(
  'notification_user_ids', ARRAY['318d0b04-1378-48f2-a616-08f2b4c5c474']::uuid[],
  'notification_level', 'all',
  'enable_sms_notifications', false
)
WHERE settings IS NULL OR settings = '{}'::jsonb OR NOT settings ? 'notification_user_ids';

-- Update forms that have settings but chris@crowdit.com.au is not in notification_user_ids
UPDATE form_templates
SET settings = jsonb_set(
  settings,
  '{notification_user_ids}',
  (
    SELECT jsonb_agg(DISTINCT value)
    FROM (
      SELECT jsonb_array_elements_text(COALESCE(settings->'notification_user_ids', '[]'::jsonb)) AS value
      UNION ALL
      SELECT '318d0b04-1378-48f2-a616-08f2b4c5c474'
    ) AS combined
  )
)
WHERE settings IS NOT NULL 
  AND settings ? 'notification_user_ids'
  AND NOT (settings->'notification_user_ids' @> '"318d0b04-1378-48f2-a616-08f2b4c5c474"'::jsonb);