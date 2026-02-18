import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Search, Clock, Loader2, 
  DollarSign, Building2, Calculator, Monitor, Users, 
  Headphones, Megaphone, UserPlus, Briefcase, GraduationCap, 
  Printer, UserMinus, FileText 
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const RECENT_REQUEST_KEY = 'recentRequestType';

interface RequestType {
  id: string;
  name: string;
  slug: string;
  description: string | null;
}

export default function NewRequest() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [recentRequestSlug, setRecentRequestSlug] = useState<string | null>(null);
  const [requestTypes, setRequestTypes] = useState<RequestType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const recent = localStorage.getItem(RECENT_REQUEST_KEY);
    if (recent) {
      setRecentRequestSlug(recent);
    }
    
    fetchRequestTypes();
  }, []);

  const fetchRequestTypes = async () => {
    try {
      const { data, error } = await supabase
        .from('request_types')
        .select('id, name, slug, description')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setRequestTypes(data || []);
    } catch (error) {
      console.error('Error fetching request types:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestClick = (slug: string) => {
    localStorage.setItem(RECENT_REQUEST_KEY, slug);
    navigate(`/requests/new/${slug}`);
  };

  const filteredRequests = requestTypes.filter(request =>
    request.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (request.description && request.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Sort: most recent first, then alphabetically
  const getIconForRequestType = (slug: string) => {
    const iconMap: Record<string, any> = {
      'accounts-payable': DollarSign,
      'facility-services': Building2,
      'finance-request': Calculator,
      'hardware-request': Monitor,
      'hr-request': Users,
      'it-service-desk': Headphones,
      'marketing-request': Megaphone,
      'marketing-service': Megaphone,
      'new-user-account': UserPlus,
      'office-services': Briefcase,
      'technology-training': GraduationCap,
      'toner-request': Printer,
      'user-offboarding': UserMinus,
    };
    return iconMap[slug] || FileText;
  };

  const sortedRequests = [...filteredRequests].sort((a, b) => {
    if (a.slug === recentRequestSlug) return -1;
    if (b.slug === recentRequestSlug) return 1;
    return a.name.localeCompare(b.name);
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">New Request</h1>
        <p className="text-muted-foreground mt-2">
          Choose the type of request you'd like to create
        </p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search request types..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {sortedRequests.map((request) => {
          const isRecent = request.slug === recentRequestSlug;
          const IconComponent = getIconForRequestType(request.slug);
          return (
            <Card
              key={request.id}
              className={`cursor-pointer transition-all hover:bg-accent/50 border hover:shadow-md ${
                isRecent ? 'ring-2 ring-primary' : ''
              }`}
              onClick={() => handleRequestClick(request.slug)}
            >
              <CardHeader className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <IconComponent className="h-5 w-5 text-primary" />
                  </div>
                  {isRecent && (
                    <Badge variant="secondary" className="text-xs">
                      <Clock className="h-3 w-3 mr-1" />
                      Recent
                    </Badge>
                  )}
                </div>
                <CardTitle className="text-base">{request.name}</CardTitle>
                {request.description && (
                  <CardDescription className="text-xs line-clamp-2">
                    {request.description}
                  </CardDescription>
                )}
              </CardHeader>
            </Card>
          );
        })}
      </div>

      {filteredRequests.length === 0 && requestTypes.length > 0 && (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">
              No request types match your search. Try a different search term.
            </p>
          </CardContent>
        </Card>
      )}

      {requestTypes.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">
              No request types are currently available. Please contact your administrator.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
