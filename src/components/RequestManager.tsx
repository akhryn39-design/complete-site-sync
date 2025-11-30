import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { FileText, Check, X, Clock, Filter, Search } from 'lucide-react';

interface Request {
  id: string;
  title: string;
  description: string;
  category: string;
  status: 'pending' | 'approved' | 'rejected';
  admin_response: string | null;
  created_at: string;
  updated_at: string;
  user_id: string;
  profiles?: {
    full_name: string;
  };
}

export const RequestManager = () => {
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [adminResponse, setAdminResponse] = useState<Record<string, string>>({});

  useEffect(() => {
    loadRequests();
    
    const channel = supabase
      .channel('requests-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'requests' }, () => {
        loadRequests();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('requests')
        .select(`
          *,
          profiles:user_id(full_name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRequests((data as any) || []);
    } catch (error) {
      console.error('Error loading requests:', error);
      toast.error('خطا در بارگذاری درخواست‌ها');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (requestId: string, status: 'approved' | 'rejected') => {
    try {
      const { error } = await supabase
        .from('requests')
        .update({
          status,
          admin_response: adminResponse[requestId] || null,
          responded_at: new Date().toISOString(),
          responded_by: (await supabase.auth.getUser()).data.user?.id
        })
        .eq('id', requestId);

      if (error) throw error;
      toast.success(status === 'approved' ? 'درخواست تأیید شد' : 'درخواست رد شد');
      setAdminResponse(prev => {
        const newState = { ...prev };
        delete newState[requestId];
        return newState;
      });
    } catch (error) {
      console.error('Error updating request:', error);
      toast.error('خطا در به‌روزرسانی درخواست');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="gap-1"><Clock className="w-3 h-3" />در انتظار</Badge>;
      case 'approved':
        return <Badge variant="default" className="gap-1 bg-green-500"><Check className="w-3 h-3" />تأیید شده</Badge>;
      case 'rejected':
        return <Badge variant="destructive" className="gap-1"><X className="w-3 h-3" />رد شده</Badge>;
      default:
        return null;
    }
  };

  const filteredRequests = requests.filter(req => {
    const matchesStatus = filterStatus === 'all' || req.status === filterStatus;
    const matchesSearch = req.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          req.description?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  if (loading) {
    return <div className="text-center py-8">در حال بارگذاری...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="جستجو در عنوان یا توضیحات..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pr-10"
          />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-full sm:w-48">
            <Filter className="w-4 h-4 ml-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">همه درخواست‌ها</SelectItem>
            <SelectItem value="pending">در انتظار</SelectItem>
            <SelectItem value="approved">تأیید شده</SelectItem>
            <SelectItem value="rejected">رد شده</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Requests List */}
      <div className="space-y-3">
        {filteredRequests.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>هیچ درخواستی یافت نشد</p>
            </CardContent>
          </Card>
        ) : (
          filteredRequests.map((request) => (
            <Card key={request.id} className="border-2">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 space-y-1">
                    <CardTitle className="text-base">{request.title}</CardTitle>
                    <CardDescription className="text-xs">
                      {request.profiles?.full_name || 'کاربر'} • {new Date(request.created_at).toLocaleDateString('fa-IR')}
                    </CardDescription>
                  </div>
                  {getStatusBadge(request.status)}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {request.description && (
                  <p className="text-sm text-muted-foreground">{request.description}</p>
                )}
                
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Badge variant="secondary">{request.category}</Badge>
                </div>

                {request.status === 'pending' && (
                  <div className="space-y-2 pt-2 border-t">
                    <Textarea
                      placeholder="پاسخ ادمین (اختیاری)"
                      value={adminResponse[request.id] || ''}
                      onChange={(e) => setAdminResponse(prev => ({ ...prev, [request.id]: e.target.value }))}
                      className="min-h-20"
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleUpdateStatus(request.id, 'approved')}
                        className="flex-1 gap-1"
                      >
                        <Check className="w-4 h-4" />
                        تأیید
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleUpdateStatus(request.id, 'rejected')}
                        className="flex-1 gap-1"
                      >
                        <X className="w-4 h-4" />
                        رد
                      </Button>
                    </div>
                  </div>
                )}

                {request.admin_response && (
                  <div className="pt-2 border-t space-y-1">
                    <p className="text-xs font-medium">پاسخ ادمین:</p>
                    <p className="text-sm text-muted-foreground">{request.admin_response}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};
