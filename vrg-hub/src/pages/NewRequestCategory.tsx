import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Loader2, ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { getIconComponent } from '@/utils/iconMap';

interface RequestCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  request_type_id: string;
}

interface RequestType {
  id: string;
  name: string;
  slug: string;
}

export default function NewRequestCategory() {
  const navigate = useNavigate();
  const { slug } = useParams<{ slug: string }>();
  const [searchQuery, setSearchQuery] = useState('');
  const [categories, setCategories] = useState<RequestCategory[]>([]);
  const [requestType, setRequestType] = useState<RequestType | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (slug) {
      fetchData();
    }
  }, [slug]);

  const fetchData = async () => {
    try {
      // Fetch request type
      const { data: typeData, error: typeError } = await supabase
        .from('request_types')
        .select('id, name, slug')
        .eq('slug', slug)
        .eq('is_active', true)
        .single();

      if (typeError) throw typeError;
      
      if (!typeData) {
        navigate('/requests/new');
        return;
      }

      setRequestType(typeData);

      // Fetch categories for this request type
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('request_categories')
        .select('id, name, slug, description, icon, request_type_id')
        .eq('request_type_id', typeData.id)
        .eq('is_active', true)
        .order('sort_order');

      if (categoriesError) throw categoriesError;

      if (!categoriesData || categoriesData.length === 0) {
        // No categories configured - stay on this page and show a message
        setCategories([]);
        setLoading(false);
        return;
      }

      setCategories(categoriesData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      navigate('/requests/new');
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryClick = (categorySlug: string) => {
    navigate(`/requests/new/${slug}/${categorySlug}`);
  };

  const filteredCategories = categories.filter(category =>
    category.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (category.description && category.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/requests/new')}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">
            {requestType?.name || 'Select Category'}
          </h1>
          <p className="text-muted-foreground mt-2">
            Choose a category for your request
          </p>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search categories..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {filteredCategories.map((category) => {
          const IconComponent = getIconComponent(category.icon);
          return (
            <Card
              key={category.id}
              className="cursor-pointer transition-all hover:bg-accent/50 border hover:shadow-md"
              onClick={() => handleCategoryClick(category.slug)}
            >
              <CardHeader className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <IconComponent className="h-5 w-5 text-primary" />
                  </div>
                </div>
                <CardTitle className="text-base">{category.name}</CardTitle>
                {category.description && (
                  <CardDescription className="text-xs line-clamp-2">
                    {category.description}
                  </CardDescription>
                )}
              </CardHeader>
            </Card>
          );
        })}
      </div>

      {filteredCategories.length === 0 && categories.length > 0 && (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">
              No categories match your search. Try a different search term.
            </p>
          </CardContent>
        </Card>
      )}

      {categories.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground mb-2">
              No categories have been configured for this request type yet.
            </p>
            <p className="text-sm text-muted-foreground">
              Please contact your administrator to add form categories for {requestType?.name || 'this request type'}.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
