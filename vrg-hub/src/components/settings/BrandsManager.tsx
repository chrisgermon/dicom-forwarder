import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { BrandLogoUpload } from './BrandLogoUpload';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Plus, Edit, Trash2, Loader2, Building2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface Brand {
  id: string;
  name: string;
  display_name: string;
  description?: string;
  logo_url?: string;
  is_active: boolean;
  sort_order: number;
}

export function BrandsManager() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadBrands();
  }, []);

  const loadBrands = async () => {
    try {
      const { data, error } = await supabase
        .from('brands')
        .select('*')
        .order('sort_order');

      if (error) throw error;
      setBrands(data || []);
    } catch (error) {
      console.error('Error loading brands:', error);
      toast({
        title: 'Error',
        description: 'Failed to load brands',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    try {
      const brandData: any = {
        name: (formData.get('name') as string).toLowerCase().replace(/\s+/g, '_'),
        display_name: formData.get('display_name') as string,
        description: formData.get('description') as string,
        sort_order: parseInt(formData.get('sort_order') as string) || 0,
        is_active: formData.get('is_active') === 'on',
      };

      // Only include logo_url if editing an existing brand
      if (editingBrand) {
        brandData.logo_url = editingBrand.logo_url;
      }

      if (editingBrand) {
        const { error } = await supabase
          .from('brands')
          .update(brandData)
          .eq('id', editingBrand.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('brands')
          .insert(brandData);

        if (error) throw error;
      }

      toast({
        title: 'Success',
        description: `Company ${editingBrand ? 'updated' : 'created'} successfully`,
      });

      setShowDialog(false);
      setEditingBrand(null);
      loadBrands();
    } catch (error) {
      console.error('Error saving brand:', error);
      toast({
        title: 'Error',
        description: 'Failed to save brand',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure? This will delete all locations associated with this brand.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('brands')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Company deleted successfully',
      });

      loadBrands();
    } catch (error) {
      console.error('Error deleting brand:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete brand',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              Brands Management
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Manage your company brands and subsidiaries
            </p>
          </div>
          <Dialog open={showDialog} onOpenChange={setShowDialog}>
            <DialogTrigger asChild>
              <Button onClick={() => setEditingBrand(null)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Company
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingBrand ? 'Edit' : 'Add'} Company</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSave} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="display_name">Display Name *</Label>
                  <Input
                    id="display_name"
                    name="display_name"
                    defaultValue={editingBrand?.display_name}
                    placeholder="e.g., Vision Radiology"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="name">Internal Name *</Label>
                  <Input
                    id="name"
                    name="name"
                    defaultValue={editingBrand?.name}
                    placeholder="e.g., vision_radiology"
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Lowercase with underscores (auto-generated from display name)
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    name="description"
                    defaultValue={editingBrand?.description}
                    rows={3}
                  />
                </div>
                {editingBrand && (
                  <div className="space-y-2">
                    <Label>Company Logo</Label>
                    <BrandLogoUpload
                      brandId={editingBrand.id}
                      currentLogoUrl={editingBrand.logo_url}
                      onLogoUpdated={(logoUrl) => {
                        setEditingBrand({ ...editingBrand, logo_url: logoUrl });
                        loadBrands();
                      }}
                    />
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="sort_order">Sort Order</Label>
                  <Input
                    id="sort_order"
                    name="sort_order"
                    type="number"
                    defaultValue={editingBrand?.sort_order || 0}
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="is_active"
                    name="is_active"
                    defaultChecked={editingBrand?.is_active ?? true}
                  />
                  <Label htmlFor="is_active">Active</Label>
                </div>
                <div className="flex gap-2 justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowDialog(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit">Save</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {brands.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No brands configured. Add your first brand to get started.
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Display Name</TableHead>
                  <TableHead>Internal Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Sort Order</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {brands.map((brand) => (
                  <TableRow key={brand.id}>
                    <TableCell className="font-medium">{brand.display_name}</TableCell>
                    <TableCell className="font-mono text-sm">{brand.name}</TableCell>
                    <TableCell>{brand.description || '-'}</TableCell>
                    <TableCell>{brand.sort_order}</TableCell>
                    <TableCell>
                      <Badge variant={brand.is_active ? 'success' : 'secondary'}>
                        {brand.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditingBrand(brand);
                            setShowDialog(true);
                          }}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(brand.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
