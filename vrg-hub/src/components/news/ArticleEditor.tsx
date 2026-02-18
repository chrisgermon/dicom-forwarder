import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, X, Sparkles, Building2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { useQuery } from '@tanstack/react-query';

interface ArticleEditorProps {
  articleId?: string;
  onSave?: () => void;
}

export default function ArticleEditor({ articleId: propArticleId, onSave }: ArticleEditorProps) {
  const { articleId: paramArticleId } = useParams();
  const id = propArticleId || paramArticleId;
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isPublished, setIsPublished] = useState(false);
  const [featuredImageUrl, setFeaturedImageUrl] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [generatingImage, setGeneratingImage] = useState(false);
  const [brandId, setBrandId] = useState<string | null>(null);

  // Fetch brands for the dropdown
  const { data: brands = [] } = useQuery({
    queryKey: ['brands-for-news'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('brands')
        .select('id, display_name')
        .eq('is_active', true)
        .order('display_name');
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (id) {
      loadArticle();
    }
  }, [id]);

  const loadArticle = async () => {
    if (!id) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('news_articles')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      if (data) {
        setTitle(data.title);
        setContent(data.content);
        setIsPublished(data.is_published);
        setFeaturedImageUrl(data.featured_image_url || '');
        setBrandId(data.brand_id || null);
      }
    } catch (error) {
      console.error('Error loading article:', error);
      toast({
        title: 'Error',
        description: 'Failed to load article',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFeaturedImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'Error',
        description: 'Image size must be less than 5MB',
        variant: 'destructive',
      });
      return;
    }

    setUploadingImage(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
      const filePath = `news-featured/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('company-assets')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('company-assets')
        .getPublicUrl(filePath);

      setFeaturedImageUrl(publicUrl);
      toast({
        title: 'Success',
        description: 'Featured image uploaded successfully',
      });
    } catch (error: any) {
      console.error('Error uploading featured image:', error);
      toast({
        title: 'Error',
        description: 'Failed to upload featured image',
        variant: 'destructive',
      });
    } finally {
      setUploadingImage(false);
    }
  };

  const handleRemoveFeaturedImage = () => {
    setFeaturedImageUrl('');
  };

  const handleGenerateImage = async () => {
    if (!title.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a title first',
        variant: 'destructive',
      });
      return;
    }

    setGeneratingImage(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-article-image', {
        body: { title }
      });

      if (error) throw error;

      if (data?.imageUrl) {
        setFeaturedImageUrl(data.imageUrl);
        toast({
          title: 'Success',
          description: 'Stock image generated successfully!',
        });
      } else {
        throw new Error('No image URL returned');
      }
    } catch (error: any) {
      console.error('Error generating image:', error);
      
      let errorMessage = 'Failed to generate image';
      if (error.message?.includes('Rate limit')) {
        errorMessage = 'Rate limit exceeded. Please try again in a moment.';
      } else if (error.message?.includes('Payment required')) {
        errorMessage = 'Please add credits to your workspace to generate images.';
      }
      
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setGeneratingImage(false);
    }
  };

  const generateSlug = (text: string): string => {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
      .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
  };

  const ensureUniqueSlug = async (baseSlug: string, excludeId?: string): Promise<string> => {
    let slug = baseSlug;
    let counter = 1;

    while (true) {
      const { data, error } = await supabase
        .from('news_articles')
        .select('id')
        .eq('slug', slug)
        .maybeSingle();

      if (error) throw error;

      // If no article found with this slug, or it's the current article, use it
      if (!data || (excludeId && data.id === excludeId)) {
        return slug;
      }

      // Otherwise, append counter and try again
      slug = `${baseSlug}-${counter}`;
      counter++;
    }
  };

  const handleSave = async () => {
    if (!user) return;

    if (!title.trim() || !content.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Title and content are required',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      // Generate slug from title
      const baseSlug = generateSlug(title);
      const slug = await ensureUniqueSlug(baseSlug, id);

      const articleData = {
        title,
        content,
        slug,
        is_published: isPublished,
        featured_image_url: featuredImageUrl || null,
        author_id: user.id,
        brand_id: brandId,
        ...(isPublished && !id ? { published_at: new Date().toISOString() } : {}),
      };

      if (id) {
        // Update existing
        const { error } = await supabase
          .from('news_articles')
          .update(articleData)
          .eq('id', id);

        if (error) throw error;

        toast({
          title: 'Success',
          description: 'Article updated successfully',
        });
      } else {
        // Create new
        const { error } = await supabase
          .from('news_articles')
          .insert([articleData]);

        if (error) throw error;

        toast({
          title: 'Success',
          description: 'Article created successfully',
        });
      }

      if (onSave) {
        onSave();
      } else {
        navigate('/news');
      }
    } catch (error) {
      console.error('Error saving article:', error);
      toast({
        title: 'Error',
        description: 'Failed to save article',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>{id ? 'Edit Article' : 'Create Article'}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Article title"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="brand">Audience</Label>
              <Select
                value={brandId || 'company-wide'}
                onValueChange={(value) => setBrandId(value === 'company-wide' ? null : value)}
              >
                <SelectTrigger>
                  <Building2 className="h-4 w-4 mr-2 text-muted-foreground" />
                  <SelectValue placeholder="Select audience" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="company-wide">Company Wide</SelectItem>
                  {brands.map((brand) => (
                    <SelectItem key={brand.id} value={brand.id}>
                      {brand.display_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Company Wide shows to all users
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="content">Content</Label>
            <RichTextEditor
              value={content}
              onChange={setContent}
              placeholder="Write your article content here..."
              enableImageUpload={true}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="featured-image">Featured Image</Label>
            {featuredImageUrl ? (
              <div className="relative">
                <img
                  src={featuredImageUrl}
                  alt="Featured"
                  className="w-full h-48 object-cover rounded-lg border"
                />
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  className="absolute top-2 right-2"
                  onClick={handleRemoveFeaturedImage}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Input
                    id="featured-image-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleFeaturedImageUpload}
                    disabled={uploadingImage || generatingImage}
                    className="flex-1"
                  />
                  {uploadingImage && <Loader2 className="h-4 w-4 animate-spin" />}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleGenerateImage}
                  disabled={generatingImage || uploadingImage || !title.trim()}
                  className="w-full"
                >
                  {generatingImage ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Generating Image...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Generate Stock Image with AI
                    </>
                  )}
                </Button>
              </div>
            )}
            <p className="text-sm text-muted-foreground">
              Upload an image, generate one with AI, or leave empty
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="published"
              checked={isPublished}
              onCheckedChange={setIsPublished}
            />
            <Label htmlFor="published">Publish article</Label>
          </div>

          <div className="flex gap-4">
            <Button
              variant="outline"
              onClick={() => onSave ? onSave() : navigate('/news')}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {id ? 'Update' : 'Create'} Article
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
