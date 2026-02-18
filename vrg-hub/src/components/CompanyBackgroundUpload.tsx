import React, { useState } from 'react';
import { Upload, X, Image } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface CompanyBackgroundUploadProps {
  companyId: string;
  currentBackgroundUrl?: string | null;
  onBackgroundUpdated?: (backgroundUrl: string | null) => void;
}

export function CompanyBackgroundUpload({ companyId, currentBackgroundUrl, onBackgroundUpdated }: CompanyBackgroundUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentBackgroundUrl || null);
  const { toast } = useToast();
  const { user } = useAuth();

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Invalid file type',
        description: 'Please upload an image file (PNG, JPG, JPEG, GIF, WebP)',
        variant: 'destructive',
      });
      return;
    }

    // Validate file size (10MB max for background images)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: 'File too large',
        description: 'Please upload an image smaller than 10MB',
        variant: 'destructive',
      });
      return;
    }

    setIsUploading(true);

    try {
      // Create file name
      const fileExt = file.name.split('.').pop();
      const fileName = `company-background-${companyId}.${fileExt}`;
      const filePath = `company-backgrounds/${fileName}`;

      // Delete existing background if any
      if (currentBackgroundUrl) {
        const existingPath = currentBackgroundUrl.split('/').slice(-2).join('/');
        if (existingPath) {
          await supabase.storage
            .from('company-assets')
            .remove([existingPath]);
        }
      }

      // Upload new background
      const { error: uploadError } = await supabase.storage
        .from('company-assets')
        .upload(filePath, file, {
          upsert: true
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('company-assets')
        .getPublicUrl(filePath);

      // Update app config (single-tenant)
      const { data: config } = await (supabase as any)
        .from('app_config')
        .select('id')
        .limit(1)
        .maybeSingle();

      if (config?.id) {
        const { error: updateError } = await (supabase as any)
          .from('app_config')
          .update({ background_image_url: publicUrl })
          .eq('id', config.id);
        if (updateError) throw updateError;
      }


      setPreviewUrl(publicUrl);
      onBackgroundUpdated?.(publicUrl);

      toast({
        title: 'Success',
        description: 'Login background image uploaded successfully',
      });
    } catch (error) {
      console.error('Error uploading background:', error);
      toast({
        title: 'Error',
        description: 'Failed to upload background image',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveBackground = async () => {
    if (!currentBackgroundUrl) return;

    setIsUploading(true);

    try {
      // Remove from storage
      const existingPath = currentBackgroundUrl.split('/').slice(-2).join('/');
      if (existingPath) {
        await supabase.storage
          .from('company-assets')
          .remove([existingPath]);
      }

    // Update app config (single-tenant)
    const { data: config } = await (supabase as any)
      .from('app_config')
      .select('id')
      .limit(1)
      .maybeSingle();

    if (config?.id) {
      const { error: updateError } = await (supabase as any)
        .from('app_config')
        .update({ background_image_url: null })
        .eq('id', config.id);
      if (updateError) throw updateError;
    }


      setPreviewUrl(null);
      onBackgroundUpdated?.(null);

      toast({
        title: 'Success',
        description: 'Background image removed successfully',
      });
    } catch (error) {
      console.error('Error removing background:', error);
      toast({
        title: 'Error',
        description: 'Failed to remove background image',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Login Background Image</CardTitle>
        <CardDescription>
          Customize the background image shown on your company's login page
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {previewUrl ? (
          <div className="space-y-4">
            <div className="relative w-full h-48 rounded-lg border overflow-hidden">
              <img 
                src={previewUrl} 
                alt="Login background preview"
                className="w-full h-full object-cover"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRemoveBackground}
              disabled={isUploading}
            >
              <X className="w-4 h-4 mr-2" />
              Remove Background
            </Button>
          </div>
        ) : (
          <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6">
            <div className="text-center">
              <Image className="mx-auto h-12 w-12 text-muted-foreground" />
              <div className="mt-4">
                <p className="text-sm text-muted-foreground">
                  No background image uploaded
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Default background will be used
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6">
          <div className="text-center">
            <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
            <div className="mt-4">
              <label htmlFor="background-upload" className="cursor-pointer">
                <span className="mt-2 block text-sm font-medium">
                  {previewUrl ? 'Replace background' : 'Upload background image'}
                </span>
                <span className="mt-1 block text-xs text-muted-foreground">
                  PNG, JPG, JPEG, GIF, WebP up to 10MB
                </span>
                <span className="mt-1 block text-xs text-muted-foreground">
                  Recommended: 1920x1080px or larger
                </span>
              </label>
              <input
                id="background-upload"
                name="background-upload"
                type="file"
                className="sr-only"
                accept="image/*"
                onChange={handleFileUpload}
                disabled={isUploading}
              />
            </div>
            {isUploading && (
              <p className="mt-2 text-sm text-muted-foreground">
                Uploading...
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
