import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { UnifiedRequestForm } from '@/components/requests/UnifiedRequestForm';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2, Settings } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { useRoleImpersonation } from '@/hooks/useRoleImpersonation';

interface RequestType {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  department_id: string;
  form_template_id: string | null;
}

interface RequestCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  assigned_to: string | null;
  form_template_id: string | null;
}

export default function NewDynamicRequest() {
  const { slug, categorySlug } = useParams<{ slug: string; categorySlug?: string }>();
  const navigate = useNavigate();
  const { effectiveRole } = useRoleImpersonation();
  const [requestType, setRequestType] = useState<RequestType | null>(null);
  const [category, setCategory] = useState<RequestCategory | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isSuperAdmin = effectiveRole === 'super_admin';

  useEffect(() => {
    const fetchRequestData = async () => {
      if (!slug) {
        setError('Invalid request type');
        setLoading(false);
        return;
      }

      try {
        // Fetch request type
        const { data: typeData, error: fetchError } = await supabase
          .from('request_types')
          .select('id, name, slug, description, department_id, form_template_id')
          .eq('slug', slug)
          .eq('is_active', true)
          .maybeSingle();

        if (fetchError) throw fetchError;

        if (!typeData) {
          setError('Request type not found or inactive');
          setLoading(false);
          return;
        }

        setRequestType(typeData);

        // Fetch category if provided
        if (categorySlug) {
          const { data: categoryData, error: categoryError } = await supabase
            .from('request_categories')
            .select('id, name, slug, description, assigned_to, form_template_id')
            .eq('request_type_id', typeData.id)
            .eq('slug', categorySlug)
            .eq('is_active', true)
            .maybeSingle();

          if (categoryError) throw categoryError;

          if (!categoryData) {
            // If navigated with fallback "/form" and no categories exist, proceed with request type form
            if (categorySlug === 'form') {
              // No category selected; continue without category
            } else {
              setError('Category not found or inactive');
              setLoading(false);
              return;
            }
          } else {
            setCategory(categoryData);
          }
        }
      } catch (err: any) {
        console.error('Error fetching request data:', err);
        setError(err.message || 'Failed to load request data');
      } finally {
        setLoading(false);
      }
    };

    fetchRequestData();
  }, [slug, categorySlug]);

  const handleBack = () => {
    if (categorySlug) {
      navigate(`/requests/new/${slug}`);
    } else {
      navigate('/requests/new');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !requestType) {
    return (
      <div className="space-y-6">
        <Button variant="outline" onClick={handleBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Request Types
        </Button>
        <Card>
          <CardContent className="pt-6">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {error || 'Request type not found'}
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={handleBack}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            {categorySlug ? 'Back to Categories' : 'Back to Request Types'}
          </Button>
          <div>
            <h1 className="text-3xl font-bold">
              {requestType.name}
              {category && ` - ${category.name}`}
            </h1>
            {(category?.description || requestType.description) && (
              <p className="text-muted-foreground mt-2">
                {category?.description || requestType.description}
              </p>
            )}
          </div>
        </div>
        {isSuperAdmin && category && (
          <Button 
            variant="outline" 
            onClick={() => navigate(`/form-templates?edit=${category.id}`)}
            className="shrink-0"
          >
            <Settings className="mr-2 h-4 w-4" />
            Edit Form
          </Button>
        )}
      </div>

      <UnifiedRequestForm
        requestTypeId={requestType.id}
        requestTypeName={requestType.name}
        departmentId={requestType.department_id}
        formTemplateId={category?.form_template_id || requestType.form_template_id || undefined}
        categoryId={category?.id}
        categoryName={category?.name}
        assignedTo={category?.assigned_to || undefined}
      />
    </div>
  );
}