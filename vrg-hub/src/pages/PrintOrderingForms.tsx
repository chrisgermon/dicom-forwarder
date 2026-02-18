import { PageContainer } from "@/components/ui/page-container";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { fetchBrandForForm } from "@/integrations/crowdforms/api";
import { Skeleton } from "@/components/ui/skeleton";

// Form codes from the CrowdForms integration
const FORM_CODES = [
  { code: '077624', name: 'Vision Radiology', color: 'from-blue-600 to-blue-800' },
  { code: '633576', name: 'Light Radiology', color: 'from-amber-500 to-orange-600' },
  { code: '484131', name: 'Focus Radiology', color: 'from-teal-600 to-cyan-700' },
  { code: '674924', name: 'Quantum Medical Imaging', color: 'from-purple-600 to-indigo-700' },
];

export default function PrintOrderingForms() {
  const navigate = useNavigate();

  // Fetch brand data for all forms to get logos
  const { data: brands, isLoading } = useQuery({
    queryKey: ['print-form-brands'],
    queryFn: async () => {
      const brandPromises = FORM_CODES.map(async (form) => {
        const brand = await fetchBrandForForm(form.code);
        return { code: form.code, brand };
      });
      return Promise.all(brandPromises);
    },
  });

  const getBrandData = (code: string) => {
    return brands?.find(b => b.code === code)?.brand;
  };

  return (
    <PageContainer maxWidth="xl" className="space-y-6">
      <PageHeader
        title="Print Ordering Forms"
        description="Select a brand to order print materials and forms for your clinic"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {FORM_CODES.map((form) => {
          const brand = getBrandData(form.code);
          
          return (
            <Card 
              key={form.code}
              className="cursor-pointer hover:shadow-lg transition-shadow overflow-hidden"
              onClick={() => navigate(`/order/${form.code}`)}
            >
              <div className={`h-24 bg-gradient-to-br ${form.color} flex items-center justify-center p-4`}>
                {isLoading ? (
                  <Skeleton className="h-16 w-16 rounded bg-white/20" />
                ) : brand?.logo_url ? (
                  <img 
                    src={brand.logo_url} 
                    alt={`${form.name} logo`}
                    className="max-h-16 max-w-full object-contain brightness-0 invert"
                  />
                ) : (
                  <span className="text-3xl font-bold text-white">
                    {form.name.charAt(0)}
                  </span>
                )}
              </div>
              <CardContent className="p-4">
                <h3 className="font-semibold text-lg">{form.name}</h3>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </PageContainer>
  );
}
