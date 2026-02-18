import { supabase } from '@/integrations/supabase/client';

interface FormTemplate {
  id: string;
  name: string;
  description: string;
}

interface RequestType {
  id: string;
  name: string;
  slug: string;
  description: string;
}

interface CategoryUpdate {
  templateId: string;
  templateName: string;
  requestTypeId: string;
  requestTypeName: string;
  categoryName: string;
  categorySlug: string;
  suggestedIcon: string;
}

// AI function to suggest icon based on category name and description
async function suggestIcon(name: string, description: string): Promise<string> {
  try {
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({
        model: 'openai/gpt-5-nano',
        messages: [
          {
            role: 'system',
            content: 'You are an icon suggestion assistant. Based on the name and description provided, suggest ONE appropriate lucide-react icon name. Reply with ONLY the icon name in PascalCase, nothing else. Examples: Wrench, Package, Users, FileText, Settings, Laptop, Printer, Shield, Lightbulb, DollarSign, Building, ClipboardList',
          },
          {
            role: 'user',
            content: `Category Name: ${name}\nDescription: ${description || 'No description'}`,
          },
        ],
      }),
    });

    const data = await response.json();
    const icon = data.choices?.[0]?.message?.content?.trim() || 'Package';
    console.log(`AI suggested icon for "${name}": ${icon}`);
    return icon;
  } catch (error) {
    console.error('Error suggesting icon:', error);
    return 'Package'; // Default fallback
  }
}

// Smart matching function to pair templates with request types
function smartMatch(templates: FormTemplate[], _requestTypes: RequestType[]): CategoryUpdate[] {
  const matches: CategoryUpdate[] = [];
  
  const matchMap: Record<string, { typeId: string; typeName: string }> = {
    // IT-related
    'IT Service Desk': { typeId: '27b3e191-1297-4c56-9bab-065d60c1b9e4', typeName: 'IT Service Desk' },
    'Hardware Request': { typeId: 'e63c0c7a-e251-4d9d-92da-bdb3f26f9832', typeName: 'Hardware Request' },
    'Technology Training': { typeId: '5fed2c0d-6c58-4336-b9f1-b0bf7bd89e0a', typeName: 'Technology Training' },
    'Toner': { typeId: '924b336a-79b1-4be7-ab58-46675bd07d41', typeName: 'Toner Request' },
    'New User Account': { typeId: 'a6a41e4e-eb12-427b-9d45-cf5e139e3da9', typeName: 'New User Account' },
    'User Offboarding': { typeId: 'f83f9113-125e-44b6-b121-95f38b09ae4b', typeName: 'User Offboarding' },
    
    // Facilities
    'Facility Services': { typeId: '0920ef52-11b0-4e6d-b433-bfb57b9a8fb5', typeName: 'Facility Services' },
    
    // Finance
    'Accounts Payable': { typeId: 'f0426c3d-835d-41cd-97f1-ee9629e1ae22', typeName: 'Accounts Payable' },
    'Finance': { typeId: '748c6e67-c251-4e2f-914d-1e30f90fc237', typeName: 'Finance Request' },
    
    // HR
    'HR': { typeId: 'defb6ffe-4f27-435c-9a79-52e7b7a00afb', typeName: 'HR Request' },
    
    // Marketing
    'Marketing Services': { typeId: '431b1716-cacf-4371-8b65-08d5b9f67677', typeName: 'Marketing Service' },
    'Marketing Request': { typeId: '9c5e99cd-f957-44ce-b9b0-475a54be7d2f', typeName: 'Marketing Request' },
    
    // Office
    'Office Services': { typeId: '32819ecf-e0e2-4de3-aa44-8dca4a28d15b', typeName: 'Office Services' },
    
    // General
    'General': { typeId: '27b3e191-1297-4c56-9bab-065d60c1b9e4', typeName: 'IT Service Desk' },
  };

  for (const template of templates) {
    // Skip if already linked (has settings with request_type_id)
    if ((template as any).settings?.request_type_id) {
      console.log(`Skipping ${template.name} - already linked`);
      continue;
    }

    let matched = false;
    
    // Try to find a match
    for (const [keyword, mapping] of Object.entries(matchMap)) {
      if (template.name.includes(keyword) || template.description?.includes(keyword)) {
        const categoryName = template.name.replace(' Form', '').replace(' Request Form', '');
        const categorySlug = categoryName.toLowerCase().replace(/\s+/g, '-');
        
        matches.push({
          templateId: template.id,
          templateName: template.name,
          requestTypeId: mapping.typeId,
          requestTypeName: mapping.typeName,
          categoryName,
          categorySlug,
          suggestedIcon: '', // Will be filled by AI
        });
        
        matched = true;
        break;
      }
    }
    
    if (!matched) {
      console.log(`No match found for: ${template.name}`);
    }
  }
  
  return matches;
}

export async function assignCategoriesAndIcons() {
  console.log('Starting category and icon assignment...');
  
  // Fetch all form templates
  const { data: templates, error: templatesError } = await supabase
    .from('form_templates')
    .select('id, name, description, settings')
    .eq('is_active', true);
  
  if (templatesError) {
    console.error('Error fetching templates:', templatesError);
    return;
  }
  
  // Fetch all request types
  const { data: requestTypes, error: typesError } = await supabase
    .from('request_types')
    .select('id, name, slug, description')
    .eq('is_active', true);
  
  if (typesError) {
    console.error('Error fetching request types:', typesError);
    return;
  }
  
  // Smart match templates to request types
  const matches = smartMatch(templates || [], requestTypes || []);
  
  console.log(`Found ${matches.length} templates to link`);
  
  // Get AI icon suggestions for each
  for (const match of matches) {
    match.suggestedIcon = await suggestIcon(match.categoryName, '');
  }
  
  // Update form templates and create/update categories
  for (const match of matches) {
    console.log(`Processing: ${match.templateName} -> ${match.requestTypeName} (${match.suggestedIcon})`);
    
    // Update form template settings
    const { error: updateError } = await supabase
      .from('form_templates')
      .update({
        settings: {
          request_type_id: match.requestTypeId,
          category_name: match.categoryName,
          category_slug: match.categorySlug,
        },
      })
      .eq('id', match.templateId);
    
    if (updateError) {
      console.error(`Error updating template ${match.templateName}:`, updateError);
      continue;
    }
    
    // Check if category already exists
    const { data: existingCategory } = await supabase
      .from('request_categories')
      .select('id')
      .eq('request_type_id', match.requestTypeId)
      .eq('slug', match.categorySlug)
      .maybeSingle();
    
    if (existingCategory) {
      // Update existing category
      const { error: catUpdateError } = await supabase
        .from('request_categories')
        .update({
          name: match.categoryName,
          form_template_id: match.templateId,
          icon: match.suggestedIcon,
        })
        .eq('id', existingCategory.id);
      
      if (catUpdateError) {
        console.error(`Error updating category:`, catUpdateError);
      } else {
        console.log(`✓ Updated category: ${match.categoryName}`);
      }
    } else {
      // Create new category
      const { error: catCreateError } = await supabase
        .from('request_categories')
        .insert({
          request_type_id: match.requestTypeId,
          name: match.categoryName,
          slug: match.categorySlug,
          form_template_id: match.templateId,
          icon: match.suggestedIcon,
          is_active: true,
        });
      
      if (catCreateError) {
        console.error(`Error creating category:`, catCreateError);
      } else {
        console.log(`✓ Created category: ${match.categoryName}`);
      }
    }
  }
  
  // Now update existing categories with AI-suggested icons
  console.log('\nUpdating existing category icons...');
  
  const { data: existingCategories } = await supabase
    .from('request_categories')
    .select('id, name, description')
    .eq('is_active', true);
  
  if (existingCategories) {
    for (const category of existingCategories) {
      const icon = await suggestIcon(category.name, category.description || '');
      
      const { error } = await supabase
        .from('request_categories')
        .update({ icon })
        .eq('id', category.id);
      
      if (!error) {
        console.log(`✓ Updated icon for "${category.name}": ${icon}`);
      }
    }
  }
  
  console.log('\n✓ Assignment complete!');
}
