import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Upload, Loader2 } from 'lucide-react';
import { ColorSchemeManager } from '@/components/settings/ColorSchemeManager';

export function CompanySettings() {
  const { toast } = useToast();
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [backgroundUrl, setBackgroundUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const { data, error } = await supabase
        .from('app_config')
        .select('*')
        .limit(1)
        .single();

      if (error) throw error;
      if (data) {
        setLogoUrl(data.logo_url);
        setBackgroundUrl(data.background_image_url);
      }
    } catch (error) {
      console.error('Error loading config:', error);
    }
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Invalid file',
        description: 'Please upload an image file',
        variant: 'destructive',
      });
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `company-logo.${fileExt}`;
      const filePath = `public/${fileName}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('company-assets')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data } = supabase.storage
        .from('company-assets')
        .getPublicUrl(filePath);

      // Update app_config
      const { error: updateError } = await supabase
        .from('app_config')
        .update({ logo_url: data.publicUrl })
        .eq('id', (await supabase.from('app_config').select('id').single()).data?.id);

      if (updateError) throw updateError;

      setLogoUrl(data.publicUrl);
      toast({
        title: 'Success',
        description: 'Logo uploaded successfully',
      });
    } catch (error) {
      console.error('Error uploading logo:', error);
      toast({
        title: 'Error',
        description: 'Failed to upload logo',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleBackgroundUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Invalid file',
        description: 'Please upload an image file',
        variant: 'destructive',
      });
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `company-background.${fileExt}`;
      const filePath = `public/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('company-assets')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('company-assets')
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('app_config')
        .update({ background_image_url: data.publicUrl })
        .eq('id', (await supabase.from('app_config').select('id').single()).data?.id);

      if (updateError) throw updateError;

      setBackgroundUrl(data.publicUrl);
      toast({
        title: 'Success',
        description: 'Background uploaded successfully',
      });
    } catch (error) {
      console.error('Error uploading background:', error);
      toast({
        title: 'Error',
        description: 'Failed to upload background',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Company Logo</CardTitle>
          <CardDescription>
            Upload your company logo
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            {logoUrl && (
              <div className="relative w-32 h-32 border rounded-lg overflow-hidden">
                <img src={logoUrl} alt="Company logo" className="w-full h-full object-contain" />
              </div>
            )}
            <div>
              <Input
                id="logo-upload"
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                disabled={uploading}
                className="hidden"
              />
              <Button
                onClick={() => document.getElementById('logo-upload')?.click()}
                disabled={uploading}
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Logo
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Background Image</CardTitle>
          <CardDescription>
            Upload a background image for your application
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            {backgroundUrl && (
              <div className="relative w-48 h-32 border rounded-lg overflow-hidden">
                <img src={backgroundUrl} alt="Background" className="w-full h-full object-cover" />
              </div>
            )}
            <div>
              <Input
                id="background-upload"
                type="file"
                accept="image/*"
                onChange={handleBackgroundUpload}
                disabled={uploading}
                className="hidden"
              />
              <Button
                onClick={() => document.getElementById('background-upload')?.click()}
                disabled={uploading}
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Background
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <ColorSchemeManager />
    </div>
  );
}
