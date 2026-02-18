-- Delete test/example requests for Pinnacle Medical Imaging company
-- This includes the user account request visible on the dashboard

-- Delete user account requests
DELETE FROM user_account_requests 
WHERE company_id = '7d3c0e8d-8f4c-4d98-ab7c-dfd9290cc00c';

-- Delete hardware requests
DELETE FROM hardware_requests 
WHERE company_id = '7d3c0e8d-8f4c-4d98-ab7c-dfd9290cc00c';

-- Delete marketing requests
DELETE FROM marketing_requests 
WHERE company_id = '7d3c0e8d-8f4c-4d98-ab7c-dfd9290cc00c';

-- Delete toner requests
DELETE FROM toner_requests 
WHERE company_id = '7d3c0e8d-8f4c-4d98-ab7c-dfd9290cc00c';