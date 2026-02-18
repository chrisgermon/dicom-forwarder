-- Add 'inbox' status to hardware_requests table
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid  
    WHERE t.typname = 'request_status' AND e.enumlabel = 'inbox') THEN
    ALTER TYPE request_status ADD VALUE IF NOT EXISTS 'inbox';
  END IF;
END$$;

-- Add 'inbox' status to marketing_requests status enum if different
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'marketing_requests' AND column_name = 'status' 
    AND data_type = 'USER-DEFINED') THEN
    
    -- Check if the enum type exists and doesn't have inbox
    IF NOT EXISTS (SELECT 1 FROM pg_enum e 
      JOIN pg_type t ON e.enumtypid = t.oid
      JOIN pg_class c ON t.typname::text LIKE '%' || c.relname || '%'
      WHERE c.relname = 'marketing_requests' AND e.enumlabel = 'inbox') THEN
      
      ALTER TYPE request_status ADD VALUE IF NOT EXISTS 'inbox';
    END IF;
  END IF;
END$$;

-- Add 'inbox' status to user_account_requests status enum if different  
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_account_requests' AND column_name = 'status' 
    AND data_type = 'USER-DEFINED') THEN
    
    IF NOT EXISTS (SELECT 1 FROM pg_enum e 
      JOIN pg_type t ON e.enumtypid = t.oid
      JOIN pg_class c ON t.typname::text LIKE '%' || c.relname || '%'
      WHERE c.relname = 'user_account_requests' AND e.enumlabel = 'inbox') THEN
      
      ALTER TYPE request_status ADD VALUE IF NOT EXISTS 'inbox';
    END IF;
  END IF;
END$$;

-- Add 'inbox' to toner_requests if it's text type
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'toner_requests' AND column_name = 'status' 
    AND data_type = 'text') THEN
    -- No enum constraint, can already use any text value including 'inbox'
    NULL;
  END IF;
END$$;

-- Add 'inbox' to department_requests if it's text type
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'department_requests' AND column_name = 'status' 
    AND data_type = 'text') THEN
    -- No enum constraint, can already use any text value including 'inbox'
    NULL;
  END IF;
END$$;