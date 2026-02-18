-- Link the new forms to their respective request types

-- Technology Training
UPDATE request_types 
SET form_template_id = 'a61671be-bba2-494e-93be-5223fb235afe' 
WHERE id = '5fed2c0d-6c58-4336-b9f1-b0bf7bd89e0a';

-- Toner Request
UPDATE request_types 
SET form_template_id = '3c794b43-b481-48e1-a59e-66f8bf3c4d33' 
WHERE id = '924b336a-79b1-4be7-ab58-46675bd07d41';

-- New User Account
UPDATE request_types 
SET form_template_id = '19bdd980-9149-4be2-9cda-953909174b10' 
WHERE id = 'a6a41e4e-eb12-427b-9d45-cf5e139e3da9';

-- User Offboarding
UPDATE request_types 
SET form_template_id = '41d57b94-2e23-43c5-ac5d-773bc1acca61' 
WHERE id = 'f83f9113-125e-44b6-b121-95f38b09ae4b';

-- Marketing Request
UPDATE request_types 
SET form_template_id = '3e126843-70b1-4364-9b2f-886df4589bf1' 
WHERE id = '9c5e99cd-f957-44ce-b9b0-475a54be7d2f';

-- Office Services (General)
UPDATE request_types 
SET form_template_id = '17058534-aa14-4a2a-8559-795c59674bf5' 
WHERE id = '32819ecf-e0e2-4de3-aa44-8dca4a28d15b';