import React, { useState } from 'react';
import { Upload, X, Image } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface BrandLogoUploadProps {
  brandId: string;
  currentLogoUrl?: string | null;
  onLogoUpdated?: (logoUrl: string | null) => void;
}

export function BrandLogoUpload({ brandId, currentLogoUrl, onLogoUpdated }: BrandLogoUploadProps) {
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
      const fileName = `brand-logo-${brandId}-${Date.now()}.${fileExt}`;
      const filePath = `brand-logos/${fileName}`;

      // Delete existing logo if any
      if (currentLogoUrl) {
        const existingPath = currentLogoUrl.split('/').slice(-2).join('/');
        if (existingPath) {
          await supabase.storage
            .from('company-assets')
            .remove([existingPath]);
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

      // Update brand
      const { error: updateError } = await supabase
        .from('brands')
        .update({ logo_url: publicUrl })
        .eq('id', brandId);

      if (updateError) throw updateError;

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
      const existingPath = currentLogoUrl.split('/').slice(-2).join('/');
      if (existingPath) {
        await supabase.storage
          .from('company-assets')
          .remove([existingPath]);
      }

      // Update brand
      const { error: updateError } = await supabase
        .from('brands')
        .update({ logo_url: null })
        .eq('id', brandId);

      if (updateError) throw updateError;

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
    <div className="space-y-4">
      {previewUrl ? (
        <div className="flex items-center gap-4">
          <div className="relative">
            <img 
              src={previewUrl} 
              alt="Company logo preview"
              className="h-16 w-16 object-contain rounded-lg border"
            />
          </div>
          <div className="flex-1">
            <p className="text-sm text-muted-foreground mb-2">
              Current brand logo
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
        <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4">
          <div className="text-center">
            <Image className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="mt-2 text-sm text-muted-foreground">
              No logo uploaded
            </p>
          </div>
        </div>
      )}

      <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4">
        <div className="text-center">
          <Upload className="mx-auto h-8 w-8 text-muted-foreground" />
          <div className="mt-2">
            <label htmlFor="brand-logo-upload" className="cursor-pointer">
              <span className="block text-sm font-medium">
                {previewUrl ? 'Replace logo' : 'Upload brand logo'}
              </span>
              <span className="block text-xs text-muted-foreground">
                PNG, JPG, JPEG, GIF, WebP up to 5MB
              </span>
            </label>
            <input
              id="brand-logo-upload"
              name="brand-logo-upload"
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
    </div>
  );
}
