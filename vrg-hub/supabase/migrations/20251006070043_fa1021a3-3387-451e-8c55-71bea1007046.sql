-- Add phone and email fields to company_locations
ALTER TABLE public.company_locations
ADD COLUMN phone TEXT,
ADD COLUMN email TEXT;

-- Get Vision Radiology company ID
DO $$
DECLARE
  vision_radiology_id UUID;
BEGIN
  SELECT id INTO vision_radiology_id
  FROM public.companies
  WHERE name = 'Vision Radiology'
  LIMIT 1;

  -- Insert all Vision Radiology locations
  IF vision_radiology_id IS NOT NULL THEN
    INSERT INTO public.company_locations (company_id, name, address, phone, is_active) VALUES
      (vision_radiology_id, 'Botanic Ridge', 'Botanic Ridge Village, Shop 17, 10 Hummingbird Drive, BOTANIC RIDGE VIC 3977', '03 9998 7455', true),
      (vision_radiology_id, 'Bulleen', 'Bulleen Plaza, Shop 12, 101 Manningham Road, BULLEEN VIC 3105', '03 9087 4344', true),
      (vision_radiology_id, 'Carnegie', '90 Koornang Road, CARNEGIE VIC 3163', '03 9087 4388', true),
      (vision_radiology_id, 'Coburg', '364 Sydney Road, COBURG VIC 3058', '03 9966 3892', true),
      (vision_radiology_id, 'Colac', 'Shop 3, 118-128 Bromfield Street, COLAC VIC 3250', '03 5208 9055', true),
      (vision_radiology_id, 'Diamond Creek', 'Diamond Creek Plaza, Shop 14, 72 Main Hurstbridge Road, DIAMOND CREEK VIC 3089', '03 8657 4933', true),
      (vision_radiology_id, 'Greensborough', 'Shop 1a & 2a, 106 Main Street, GREENSBOROUGH VIC 3088', '03 7044 2077', true),
      (vision_radiology_id, 'Hampton East', 'Hampton Day Hospital, 336-338 South Road, HAMPTON EAST VIC 3188', '03 9125 0099', true),
      (vision_radiology_id, 'Kangaroo Flat', '99-105 High Street, KANGAROO FLAT VIC 3555', '03 9087 4377', true),
      (vision_radiology_id, 'Kyabram', '130 Allan Street, KYABRAM VIC 3620', '03 4831 8533', true),
      (vision_radiology_id, 'Lilydale', '275 Main Street, LILYDALE VIC 3140', '03 8658 0944', true),
      (vision_radiology_id, 'Lynbrook', 'Lynbrook Village Shopping Centre, Shop 34, 75 Lynbrook Boulevard, LYNBROOK VIC 3975', '03 7065 5811', true),
      (vision_radiology_id, 'Mentone', '45-47 Balcombe Road, MENTONE VIC 3194', '03 7064 4066', true),
      (vision_radiology_id, 'Mornington', '947 Nepean Highway, MORNINGTON VIC 3931', '03 5947 5835', true),
      (vision_radiology_id, 'Mulgrave', 'Mulgrave Business Park, Suite G03, 372 Wellington Road, MULGRAVE VIC 3170', '03 9087 4322', true),
      (vision_radiology_id, 'North Melbourne', '267 Flemington Road, NORTH MELBOURNE VIC 3051', '03 9008 7266', true),
      (vision_radiology_id, 'Reservoir', 'Reservoir Private Hospital, 24 Willoughby Street, RESERVOIR VIC 3073', '03 9118 8246', true),
      (vision_radiology_id, 'Sebastopol', '43 Albert Street, SEBASTOPOL VIC 3356', '03 4313 2117', true),
      (vision_radiology_id, 'Shepparton', '79A Wyndham Street, SHEPPARTON VIC 3630', '03 9087 4355', true),
      (vision_radiology_id, 'Thornbury', '621 High Street, THORNBURY VIC 3071', '03 9957 8881', true),
      (vision_radiology_id, 'Torquay', 'Torquay Medical Hub, Suite G06, 1 Cylinders Drive, TORQUAY VIC 3228', '03 5292 9911', true),
      (vision_radiology_id, 'Werribee', '4 Bridge Street, WERRIBEE VIC 3030', '03 8592 6399', true),
      (vision_radiology_id, 'Williamstown', 'Shop 1, 66 Douglas Parade, WILLIAMSTOWN VIC 3016', '03 8592 6300', true);
  END IF;
END $$;