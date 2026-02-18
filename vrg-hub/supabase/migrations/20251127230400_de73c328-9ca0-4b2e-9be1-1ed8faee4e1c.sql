-- Function to calculate completion percentage for a checklist
CREATE OR REPLACE FUNCTION calculate_completion_percentage(p_completion_id uuid)
RETURNS void AS $$
DECLARE
  v_total_items integer;
  v_completed_items integer;
  v_percentage numeric;
BEGIN
  -- Count total items for this completion's template
  SELECT COUNT(*)
  INTO v_total_items
  FROM checklist_items ci
  JOIN checklist_completions cc ON ci.template_id = cc.template_id
  WHERE cc.id = p_completion_id;

  -- Count completed items (status = 'completed' or 'na')
  SELECT COUNT(*)
  INTO v_completed_items
  FROM checklist_item_completions
  WHERE completion_id = p_completion_id
    AND status IN ('completed', 'na');

  -- Calculate percentage
  IF v_total_items > 0 THEN
    v_percentage := (v_completed_items::numeric / v_total_items::numeric) * 100;
  ELSE
    v_percentage := 0;
  END IF;

  -- Update the checklist_completions record
  UPDATE checklist_completions
  SET completion_percentage = ROUND(v_percentage)
  WHERE id = p_completion_id;
END;
$$ LANGUAGE plpgsql;

-- Trigger function to automatically update completion percentage
CREATE OR REPLACE FUNCTION update_completion_percentage_trigger()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate and update completion percentage for the affected completion
  PERFORM calculate_completion_percentage(
    CASE 
      WHEN TG_OP = 'DELETE' THEN OLD.completion_id
      ELSE NEW.completion_id
    END
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS checklist_item_completion_percentage_trigger ON checklist_item_completions;

-- Create trigger on checklist_item_completions
CREATE TRIGGER checklist_item_completion_percentage_trigger
AFTER INSERT OR UPDATE OR DELETE ON checklist_item_completions
FOR EACH ROW
EXECUTE FUNCTION update_completion_percentage_trigger();

-- Update all existing completions to have correct percentages
DO $$
DECLARE
  completion_record RECORD;
BEGIN
  FOR completion_record IN 
    SELECT DISTINCT id FROM checklist_completions
  LOOP
    PERFORM calculate_completion_percentage(completion_record.id);
  END LOOP;
END $$;