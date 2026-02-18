-- Clinic Setup Checklists (one per clinic being set up)
CREATE TABLE public.clinic_setup_checklists (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    clinic_name TEXT NOT NULL,
    go_live_date DATE,
    lease_handover_date TEXT,
    brand_id UUID REFERENCES public.brands(id),
    location_id UUID REFERENCES public.locations(id),
    status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('draft', 'in_progress', 'completed')),
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Sections within a checklist (e.g., "Entity Setup", "Building Info", etc.)
CREATE TABLE public.clinic_setup_sections (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    checklist_id UUID NOT NULL REFERENCES public.clinic_setup_checklists(id) ON DELETE CASCADE,
    section_name TEXT NOT NULL,
    section_owner TEXT, -- e.g., "Mays", "Mustafa", "Nabeel"
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Individual items within a section
CREATE TABLE public.clinic_setup_items (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    section_id UUID NOT NULL REFERENCES public.clinic_setup_sections(id) ON DELETE CASCADE,
    field_name TEXT NOT NULL,
    field_type TEXT NOT NULL DEFAULT 'text' CHECK (field_type IN ('text', 'boolean', 'date', 'select', 'textarea', 'supplier', 'equipment')),
    field_value TEXT,
    field_options JSONB, -- For dropdowns/selects
    is_completed BOOLEAN DEFAULT false,
    completed_by UUID,
    completed_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- User permissions for checklists
CREATE TABLE public.clinic_setup_permissions (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    checklist_id UUID NOT NULL REFERENCES public.clinic_setup_checklists(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    permission_level TEXT NOT NULL DEFAULT 'view' CHECK (permission_level IN ('view', 'edit', 'admin')),
    granted_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(checklist_id, user_id)
);

-- Activity log for email notifications
CREATE TABLE public.clinic_setup_activity (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    checklist_id UUID NOT NULL REFERENCES public.clinic_setup_checklists(id) ON DELETE CASCADE,
    item_id UUID REFERENCES public.clinic_setup_items(id) ON DELETE SET NULL,
    user_id UUID NOT NULL,
    action TEXT NOT NULL,
    old_value TEXT,
    new_value TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.clinic_setup_checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinic_setup_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinic_setup_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinic_setup_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinic_setup_activity ENABLE ROW LEVEL SECURITY;

-- RLS Policies for clinic_setup_checklists
CREATE POLICY "Users with permission can view checklists"
ON public.clinic_setup_checklists FOR SELECT
USING (
    auth.uid() = created_by 
    OR EXISTS (
        SELECT 1 FROM public.clinic_setup_permissions 
        WHERE checklist_id = clinic_setup_checklists.id 
        AND user_id = auth.uid()
    )
    OR EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() 
        AND role IN ('super_admin', 'tenant_admin')
    )
);

CREATE POLICY "Admins can create checklists"
ON public.clinic_setup_checklists FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() 
        AND role IN ('super_admin', 'tenant_admin')
    )
    OR EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid()
        AND email = 'mays@visionradiology.com.au'
    )
);

CREATE POLICY "Admins can update checklists"
ON public.clinic_setup_checklists FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() 
        AND role IN ('super_admin', 'tenant_admin')
    )
    OR EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid()
        AND email = 'mays@visionradiology.com.au'
    )
    OR EXISTS (
        SELECT 1 FROM public.clinic_setup_permissions 
        WHERE checklist_id = clinic_setup_checklists.id 
        AND user_id = auth.uid()
        AND permission_level IN ('edit', 'admin')
    )
);

CREATE POLICY "Admins can delete checklists"
ON public.clinic_setup_checklists FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() 
        AND role IN ('super_admin', 'tenant_admin')
    )
    OR EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid()
        AND email = 'mays@visionradiology.com.au'
    )
);

-- RLS for sections
CREATE POLICY "Users can view sections if they can view checklist"
ON public.clinic_setup_sections FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.clinic_setup_checklists c
        WHERE c.id = clinic_setup_sections.checklist_id
        AND (
            c.created_by = auth.uid()
            OR EXISTS (
                SELECT 1 FROM public.clinic_setup_permissions p
                WHERE p.checklist_id = c.id AND p.user_id = auth.uid()
            )
            OR EXISTS (
                SELECT 1 FROM public.user_roles 
                WHERE user_id = auth.uid() 
                AND role IN ('super_admin', 'tenant_admin')
            )
        )
    )
);

CREATE POLICY "Users with edit permission can manage sections"
ON public.clinic_setup_sections FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.clinic_setup_checklists c
        WHERE c.id = clinic_setup_sections.checklist_id
        AND (
            EXISTS (
                SELECT 1 FROM public.user_roles 
                WHERE user_id = auth.uid() 
                AND role IN ('super_admin', 'tenant_admin')
            )
            OR EXISTS (
                SELECT 1 FROM public.profiles
                WHERE id = auth.uid()
                AND email = 'mays@visionradiology.com.au'
            )
            OR EXISTS (
                SELECT 1 FROM public.clinic_setup_permissions p
                WHERE p.checklist_id = c.id 
                AND p.user_id = auth.uid()
                AND p.permission_level IN ('edit', 'admin')
            )
        )
    )
);

-- RLS for items
CREATE POLICY "Users can view items if they can view checklist"
ON public.clinic_setup_items FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.clinic_setup_sections s
        JOIN public.clinic_setup_checklists c ON c.id = s.checklist_id
        WHERE s.id = clinic_setup_items.section_id
        AND (
            c.created_by = auth.uid()
            OR EXISTS (
                SELECT 1 FROM public.clinic_setup_permissions p
                WHERE p.checklist_id = c.id AND p.user_id = auth.uid()
            )
            OR EXISTS (
                SELECT 1 FROM public.user_roles 
                WHERE user_id = auth.uid() 
                AND role IN ('super_admin', 'tenant_admin')
            )
        )
    )
);

CREATE POLICY "Users with edit permission can manage items"
ON public.clinic_setup_items FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.clinic_setup_sections s
        JOIN public.clinic_setup_checklists c ON c.id = s.checklist_id
        WHERE s.id = clinic_setup_items.section_id
        AND (
            EXISTS (
                SELECT 1 FROM public.user_roles 
                WHERE user_id = auth.uid() 
                AND role IN ('super_admin', 'tenant_admin')
            )
            OR EXISTS (
                SELECT 1 FROM public.profiles
                WHERE id = auth.uid()
                AND email = 'mays@visionradiology.com.au'
            )
            OR EXISTS (
                SELECT 1 FROM public.clinic_setup_permissions p
                WHERE p.checklist_id = c.id 
                AND p.user_id = auth.uid()
                AND p.permission_level IN ('edit', 'admin')
            )
        )
    )
);

-- RLS for permissions
CREATE POLICY "Admins can manage permissions"
ON public.clinic_setup_permissions FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() 
        AND role IN ('super_admin', 'tenant_admin')
    )
    OR EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid()
        AND email = 'mays@visionradiology.com.au'
    )
);

CREATE POLICY "Users can view their own permissions"
ON public.clinic_setup_permissions FOR SELECT
USING (user_id = auth.uid());

-- RLS for activity
CREATE POLICY "Users can view activity for accessible checklists"
ON public.clinic_setup_activity FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.clinic_setup_checklists c
        WHERE c.id = clinic_setup_activity.checklist_id
        AND (
            c.created_by = auth.uid()
            OR EXISTS (
                SELECT 1 FROM public.clinic_setup_permissions p
                WHERE p.checklist_id = c.id AND p.user_id = auth.uid()
            )
            OR EXISTS (
                SELECT 1 FROM public.user_roles 
                WHERE user_id = auth.uid() 
                AND role IN ('super_admin', 'tenant_admin')
            )
        )
    )
);

CREATE POLICY "Users with edit permission can create activity"
ON public.clinic_setup_activity FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.clinic_setup_checklists c
        WHERE c.id = clinic_setup_activity.checklist_id
        AND (
            EXISTS (
                SELECT 1 FROM public.user_roles 
                WHERE user_id = auth.uid() 
                AND role IN ('super_admin', 'tenant_admin')
            )
            OR EXISTS (
                SELECT 1 FROM public.profiles
                WHERE id = auth.uid()
                AND email = 'mays@visionradiology.com.au'
            )
            OR EXISTS (
                SELECT 1 FROM public.clinic_setup_permissions p
                WHERE p.checklist_id = c.id 
                AND p.user_id = auth.uid()
                AND p.permission_level IN ('edit', 'admin')
            )
        )
    )
);

-- Trigger for updated_at
CREATE TRIGGER update_clinic_setup_checklists_updated_at
BEFORE UPDATE ON public.clinic_setup_checklists
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_clinic_setup_sections_updated_at
BEFORE UPDATE ON public.clinic_setup_sections
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_clinic_setup_items_updated_at
BEFORE UPDATE ON public.clinic_setup_items
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();