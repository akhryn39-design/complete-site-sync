import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Trash2, Shield, User, ArrowLeft, Search, Users, UserCheck, Crown, RefreshCw, Bell } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface EnrichedUser {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string;
  role: string;
  created_at: string;
  last_sign_in?: string;
}

interface AdminStats {
  totalUsers: number;
  admins: number;
  moderators: number;
  regularUsers: number;
}

const UserManagement = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [users, setUsers] = useState<EnrichedUser[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<EnrichedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [stats, setStats] = useState<AdminStats>({ totalUsers: 0, admins: 0, moderators: 0, regularUsers: 0 });
  const [notifications, setNotifications] = useState<string[]>([]);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [users, searchQuery, roleFilter]);

  const filterUsers = () => {
    let filtered = [...users];
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(u => 
        u.full_name?.toLowerCase().includes(query) ||
        u.email?.toLowerCase().includes(query)
      );
    }
    
    if (roleFilter !== 'all') {
      filtered = filtered.filter(u => u.role === roleFilter);
    }
    
    setFilteredUsers(filtered);
  };

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate('/auth');
      return;
    }

    setCurrentUserId(session.user.id);

    const { data: adminCheck } = await supabase.rpc('has_role', {
      _user_id: session.user.id,
      _role: 'admin'
    });

    if (!adminCheck) {
      toast({
        title: 'دسترسی محدود',
        description: 'فقط مدیران به این بخش دسترسی دارند',
        variant: 'destructive'
      });
      navigate('/chat');
      return;
    }

    setIsAdmin(true);
    loadUsers();
    loadStats();
  };

  const loadUsers = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
        },
        body: JSON.stringify({ action: 'listUsers' })
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'خطا در دریافت لیست کاربران');
      }

      setUsers(result.users || []);
      
      // Add notification for new users
      const recentUsers = result.users?.filter((u: EnrichedUser) => {
        const created = new Date(u.created_at);
        const now = new Date();
        const diffHours = (now.getTime() - created.getTime()) / (1000 * 60 * 60);
        return diffHours < 24;
      }) || [];
      
      if (recentUsers.length > 0) {
        setNotifications(prev => [
          ...prev,
          `${recentUsers.length} کاربر جدید در ۲۴ ساعت اخیر ثبت‌نام کرده‌اند`
        ]);
      }
    } catch (error: any) {
      toast({
        title: 'خطا در بارگذاری کاربران',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
        },
        body: JSON.stringify({ action: 'getAdminStats' })
      });

      const result = await response.json();
      if (response.ok) {
        setStats(result);
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const deleteUser = async (userId: string) => {
    if (userId === currentUserId) {
      toast({
        title: 'خطا',
        description: 'نمی‌توانید خودتان را حذف کنید',
        variant: 'destructive'
      });
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
        },
        body: JSON.stringify({ action: 'deleteUser', userId })
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'خطا در حذف کاربر');
      }

      toast({
        title: 'حذف موفق',
        description: 'کاربر با موفقیت حذف شد'
      });
      loadUsers();
      loadStats();
    } catch (error: any) {
      toast({
        title: 'خطا در حذف کاربر',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const updateUserRole = async (userId: string, newRole: string) => {
    if (userId === currentUserId && newRole !== 'admin') {
      toast({
        title: 'خطا',
        description: 'نمی‌توانید نقش خود را تغییر دهید',
        variant: 'destructive'
      });
      return;
    }

    try {
      // Delete existing role
      await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId);

      // Insert new role
      const { error } = await supabase
        .from('user_roles')
        .insert([{ user_id: userId, role: newRole as 'admin' | 'moderator' | 'user' }]);

      if (error) throw error;

      toast({
        title: 'تغییر نقش',
        description: 'نقش کاربر با موفقیت تغییر یافت'
      });
      loadUsers();
      loadStats();
    } catch (error: any) {
      toast({
        title: 'خطا در تغییر نقش',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const getRoleBadgeClass = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-gradient-to-r from-primary to-secondary text-primary-foreground';
      case 'moderator': return 'bg-gradient-to-r from-accent to-secondary text-accent-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin': return 'مدیر';
      case 'moderator': return 'ناظر';
      default: return 'کاربر';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-gradient-to-br from-background via-background to-muted/20">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground animate-pulse">در حال بارگذاری...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 p-3 sm:p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2 sm:gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate('/chat')} className="gap-1 sm:gap-2 hover:bg-primary/10">
              <ArrowLeft className="h-4 w-4" />
              <span className="text-xs sm:text-sm">بازگشت</span>
            </Button>
            <div>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold gradient-text">مدیریت کاربران</h1>
              <p className="text-xs sm:text-sm text-muted-foreground">مدیریت کاربران، نقش‌ها و دسترسی‌ها</p>
            </div>
          </div>
          <Button onClick={loadUsers} variant="outline" size="sm" className="gap-2">
            <RefreshCw className="h-4 w-4" />
            بروزرسانی
          </Button>
        </div>

        {/* Notifications */}
        {notifications.length > 0 && (
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2 text-primary">
                <Bell className="h-5 w-5 animate-bounce" />
                <span className="text-sm font-medium">{notifications[notifications.length - 1]}</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          <Card className="bg-gradient-to-br from-card to-card/80 border-border/50 hover:shadow-elegant transition-all">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.totalUsers}</p>
                <p className="text-xs text-muted-foreground">کل کاربران</p>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-card to-card/80 border-border/50 hover:shadow-elegant transition-all">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-secondary/10 flex items-center justify-center">
                <Crown className="h-6 w-6 text-secondary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.admins}</p>
                <p className="text-xs text-muted-foreground">مدیران</p>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-card to-card/80 border-border/50 hover:shadow-elegant transition-all">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
                <Shield className="h-6 w-6 text-accent" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.moderators}</p>
                <p className="text-xs text-muted-foreground">ناظران</p>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-card to-card/80 border-border/50 hover:shadow-elegant transition-all">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center">
                <UserCheck className="h-6 w-6 text-muted-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.regularUsers}</p>
                <p className="text-xs text-muted-foreground">کاربران عادی</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filter */}
        <Card className="border-border/50">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="جستجو بر اساس نام یا ایمیل..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pr-10"
                />
              </div>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue placeholder="فیلتر نقش" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">همه نقش‌ها</SelectItem>
                  <SelectItem value="admin">مدیران</SelectItem>
                  <SelectItem value="moderator">ناظران</SelectItem>
                  <SelectItem value="user">کاربران عادی</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Users Table */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <User className="h-4 w-4 sm:h-5 sm:w-5" />
              لیست کاربران ({filteredUsers.length} از {users.length})
            </CardTitle>
            <CardDescription>مدیریت و ویرایش اطلاعات کاربران</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto -mx-4 sm:mx-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs sm:text-sm">نام</TableHead>
                    <TableHead className="text-xs sm:text-sm hidden sm:table-cell">ایمیل</TableHead>
                    <TableHead className="text-xs sm:text-sm">نقش</TableHead>
                    <TableHead className="text-xs sm:text-sm hidden md:table-cell">تاریخ عضویت</TableHead>
                    <TableHead className="text-xs sm:text-sm hidden lg:table-cell">آخرین ورود</TableHead>
                    <TableHead className="text-xs sm:text-sm text-left">عملیات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell className="text-xs sm:text-sm font-medium">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-primary-foreground text-xs font-bold">
                            {user.full_name?.[0] || '?'}
                          </div>
                          <span>{user.full_name || 'بدون نام'}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs sm:text-sm text-muted-foreground hidden sm:table-cell" dir="ltr">
                        {user.email || '-'}
                      </TableCell>
                      <TableCell>
                        <Select
                          value={user.role}
                          onValueChange={(value) => updateUserRole(user.id, value)}
                          disabled={user.id === currentUserId}
                        >
                          <SelectTrigger className="w-24 sm:w-32 h-7 sm:h-9 text-xs sm:text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="user">کاربر</SelectItem>
                            <SelectItem value="moderator">ناظر</SelectItem>
                            <SelectItem value="admin">مدیر</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-xs sm:text-sm text-muted-foreground hidden md:table-cell">
                        {new Date(user.created_at).toLocaleDateString('fa-IR')}
                      </TableCell>
                      <TableCell className="text-xs sm:text-sm text-muted-foreground hidden lg:table-cell">
                        {user.last_sign_in ? new Date(user.last_sign_in).toLocaleDateString('fa-IR') : '-'}
                      </TableCell>
                      <TableCell className="text-left">
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={user.id === currentUserId}
                              className="h-7 w-7 sm:h-8 sm:w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="max-w-[90vw] sm:max-w-md">
                            <AlertDialogHeader>
                              <AlertDialogTitle className="text-sm sm:text-base">حذف کاربر</AlertDialogTitle>
                              <AlertDialogDescription className="text-xs sm:text-sm">
                                آیا مطمئن هستید که می‌خواهید کاربر "{user.full_name}" را حذف کنید؟ این عملیات قابل بازگشت نیست.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter className="flex-col sm:flex-row gap-2">
                              <AlertDialogCancel className="text-xs sm:text-sm">لغو</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteUser(user.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90 text-xs sm:text-sm"
                              >
                                حذف
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {filteredUsers.length === 0 && (
              <div className="text-center py-8 sm:py-12 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-xs sm:text-sm">هیچ کاربری یافت نشد</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default UserManagement;