-- Create basic form templates for all categories that don't have forms yet
DO $$
DECLARE
  category_record RECORD;
  new_template_id uuid;
  standard_fields jsonb;
BEGIN
  -- Define standard fields that all forms should have
  standard_fields := '[
    {
      "id": "field_title",
      "type": "text",
      "label": "Request Title",
      "placeholder": "Enter a brief title for your request",
      "required": true,
      "order": 0
    },
    {
      "id": "field_description",
      "type": "textarea",
      "label": "Issue Description",
      "placeholder": "Describe the issue in detail...",
      "required": true,
      "order": 1
    }
  ]'::jsonb;

  -- Loop through all active categories without form templates
  FOR category_record IN 
    SELECT 
      rc.id,
      rc.name,
      rc.slug,
      rc.request_type_id,
      rt.name as request_type_name
    FROM request_categories rc
    JOIN request_types rt ON rc.request_type_id = rt.id
    WHERE rc.is_active = true 
    AND rc.form_template_id IS NULL
  LOOP
    -- Insert a new form template
    INSERT INTO form_templates (
      name,
      description,
      form_type,
      fields,
      is_active,
      settings
    ) VALUES (
      category_record.name || ' Form',
      'Standard form for ' || category_record.name || ' requests',
      'general',
      standard_fields,
      true,
      jsonb_build_object(
        'request_type_id', category_record.request_type_id,
        'category_name', category_record.name,
        'category_slug', category_record.slug
      )
    )
    RETURNING id INTO new_template_id;

    -- Link the form template to the category
    UPDATE request_categories
    SET form_template_id = new_template_id
    WHERE id = category_record.id;

    RAISE NOTICE 'Created form template for category: %', category_record.name;
  END LOOP;
END $$;