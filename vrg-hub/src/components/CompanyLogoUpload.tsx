import React, { useState } from 'react';
import { Upload, X, Image } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface CompanyLogoUploadProps {
  companyId: string;
  currentLogoUrl?: string | null;
  onLogoUpdated?: (logoUrl: string | null) => void;
}

export function CompanyLogoUpload({ companyId, currentLogoUrl, onLogoUpdated }: CompanyLogoUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentLogoUrl || null);
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

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'File too large',
        description: 'Please upload an image smaller than 5MB',
        variant: 'destructive',
      });
      return;
    }

    setIsUploading(true);

    try {
      // Create file name
      const fileExt = file.name.split('.').pop();
      const fileName = `company-logo-${companyId}.${fileExt}`;
      const filePath = `company-logos/${fileName}`;

      // Delete existing logo if any
      if (currentLogoUrl) {
        const existingPath = currentLogoUrl.split('/').pop();
        if (existingPath) {
          await supabase.storage
            .from('company-assets')
            .remove([`company-logos/${existingPath}`]);
        }
      }

      // Upload new logo
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
          .update({ logo_url: publicUrl })
          .eq('id', config.id);
        if (updateError) throw updateError;
      }


      setPreviewUrl(publicUrl);
      onLogoUpdated?.(publicUrl);

      toast({
        title: 'Success',
        description: 'Company logo uploaded successfully',
      });
    } catch (error) {
      console.error('Error uploading logo:', error);
      toast({
        title: 'Error',
        description: 'Failed to upload logo',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveLogo = async () => {
    if (!currentLogoUrl) return;

    setIsUploading(true);

    try {
      // Remove from storage
      const existingPath = currentLogoUrl.split('/').pop();
      if (existingPath) {
        await supabase.storage
          .from('company-assets')
          .remove([`company-logos/${existingPath}`]);
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
        .update({ logo_url: null })
        .eq('id', config.id);
      if (updateError) throw updateError;
    }


      setPreviewUrl(null);
      onLogoUpdated?.(null);

      toast({
        title: 'Success',
        description: 'Company logo removed successfully',
      });
    } catch (error) {
      console.error('Error removing logo:', error);
      toast({
        title: 'Error',
        description: 'Failed to remove logo',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Company Logo</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {previewUrl ? (
          <div className="flex items-center gap-4">
            <div className="relative">
              <img 
                src={previewUrl} 
                alt="Company logo preview"
                className="h-24 w-24 object-contain rounded-lg border"
              />
            </div>
            <div className="flex-1">
              <p className="text-sm text-muted-foreground mb-2">
                Current company logo
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRemoveLogo}
                disabled={isUploading}
              >
                <X className="w-4 h-4 mr-2" />
                Remove Logo
              </Button>
            </div>
          </div>
        ) : (
          <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6">
            <div className="text-center">
              <Image className="mx-auto h-12 w-12 text-muted-foreground" />
              <div className="mt-4">
                <p className="text-sm text-muted-foreground">
                  No logo uploaded
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6">
          <div className="text-center">
            <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
            <div className="mt-4">
              <label htmlFor="logo-upload" className="cursor-pointer">
                <span className="mt-2 block text-sm font-medium">
                  {previewUrl ? 'Replace logo' : 'Upload company logo'}
                </span>
                <span className="mt-1 block text-xs text-muted-foreground">
                  PNG, JPG, JPEG, GIF, WebP up to 5MB
                </span>
              </label>
              <input
                id="logo-upload"
                name="logo-upload"
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