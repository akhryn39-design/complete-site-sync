import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SystemSettings } from '@/components/SystemSettings';
import { NewsManager } from '@/components/NewsManager';
import AdManager from '@/components/AdManager';
import { useToast } from '@/hooks/use-toast';
import { 
  ArrowLeft, 
  Settings, 
  Newspaper, 
  ImageIcon, 
  Users, 
  BookOpen,
  BarChart3,
  Database,
  Shield,
  FileText
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const Admin = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    users: 0,
    conversations: 0,
    materials: 0,
    news: 0,
    ads: 0,
  });

  useEffect(() => {
    checkAdminAccess();
  }, []);

  const checkAdminAccess = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/auth');
        return;
      }

      const { data, error } = await supabase.rpc('has_role', {
        _user_id: user.id,
        _role: 'admin'
      });

      if (error) throw error;

      if (data !== true) {
        toast({
          title: 'دسترسی غیرمجاز',
          description: 'شما دسترسی به پنل مدیریت ندارید',
          variant: 'destructive',
        });
        navigate('/chat');
        return;
      }

      setIsAdmin(true);
      await loadStats();
    } catch (error: any) {
      console.error('Error checking admin access:', error);
      navigate('/chat');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const [profilesRes, conversationsRes, materialsRes, newsRes, adsRes] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('conversations').select('id', { count: 'exact', head: true }),
        supabase.from('educational_materials').select('id', { count: 'exact', head: true }),
        supabase.from('news').select('id', { count: 'exact', head: true }),
        supabase.from('advertisements').select('id', { count: 'exact', head: true }),
      ]);

      setStats({
        users: profilesRes.count || 0,
        conversations: conversationsRes.count || 0,
        materials: materialsRes.count || 0,
        news: newsRes.count || 0,
        ads: adsRes.count || 0,
      });
    } catch (error: any) {
      console.error('Error loading stats:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="container mx-auto p-4 md:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <Button
              variant="ghost"
              onClick={() => navigate('/chat')}
              className="gap-2 self-start"
            >
              <ArrowLeft className="w-4 h-4" />
              بازگشت
            </Button>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold gradient-text">پنل مدیریت</h1>
              <p className="text-xs md:text-sm text-muted-foreground mt-1">
                مدیریت کامل سیستم دانشگاه پیام‌نور
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => navigate('/requests')}
              variant="outline"
              className="gap-2"
            >
              <FileText className="w-4 h-4" />
              <span className="hidden sm:inline">درخواست‌ها</span>
            </Button>
            <Badge variant="outline" className="gap-2">
              <Shield className="w-4 h-4" />
              <span className="hidden sm:inline">مدیر سیستم</span>
            </Badge>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">کاربران</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.users}</div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">گفتگوها</CardTitle>
              <Database className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.conversations}</div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">مواد آموزشی</CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.materials}</div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">اخبار</CardTitle>
              <Newspaper className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.news}</div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">تبلیغات</CardTitle>
              <ImageIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.ads}</div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="settings" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="settings" className="gap-1 sm:gap-2 text-xs sm:text-sm">
              <Settings className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">تنظیمات سیستم</span>
              <span className="sm:hidden">تنظیمات</span>
            </TabsTrigger>
            <TabsTrigger value="news" className="gap-1 sm:gap-2 text-xs sm:text-sm">
              <Newspaper className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">مدیریت اخبار</span>
              <span className="sm:hidden">اخبار</span>
            </TabsTrigger>
            <TabsTrigger value="ads" className="gap-1 sm:gap-2 text-xs sm:text-sm">
              <ImageIcon className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">مدیریت تبلیغات</span>
              <span className="sm:hidden">تبلیغات</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="settings" className="space-y-4">
            <SystemSettings />
          </TabsContent>

          <TabsContent value="news" className="space-y-4">
            <NewsManager />
          </TabsContent>

          <TabsContent value="ads" className="space-y-4">
            <AdManager />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Admin;
