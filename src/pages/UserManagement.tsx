import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Trash2, Shield, User, ArrowLeft } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface UserProfile {
  id: string;
  full_name: string | null;
  created_at: string;
  email?: string;
  role?: string;
}

const UserManagement = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    checkAuth();
  }, []);

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
  };

  const loadUsers = async () => {
    setLoading(true);
    try {
      // Get all profiles
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profileError) throw profileError;

      // Get user roles
      const { data: roles } = await supabase
        .from('user_roles')
        .select('user_id, role');

      // Get auth users (emails) - using admin API
      const { data } = await supabase.auth.admin.listUsers();
      const authUsers = data?.users || [];

      const enrichedUsers = profiles?.map(profile => {
        const userRole = roles?.find(r => r.user_id === profile.id);
        const authUser = authUsers?.find(u => u.id === profile.id);
        return {
          ...profile,
          email: authUser?.email,
          role: userRole?.role || 'user'
        };
      }) || [];

      setUsers(enrichedUsers);
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
      const { error } = await supabase.auth.admin.deleteUser(userId);
      if (error) throw error;

      toast({
        title: 'حذف موفق',
        description: 'کاربر با موفقیت حذف شد'
      });
      loadUsers();
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
    } catch (error: any) {
      toast({
        title: 'خطا در تغییر نقش',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin': return 'default';
      case 'moderator': return 'secondary';
      default: return 'outline';
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
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 p-3 sm:p-4 md:p-6">
      <div className="max-w-6xl mx-auto space-y-4 sm:space-y-6">
        <div className="flex items-center gap-2 sm:gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/chat')} className="gap-1 sm:gap-2">
            <ArrowLeft className="h-4 w-4" />
            <span className="text-xs sm:text-sm">بازگشت</span>
          </Button>
          <div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold gradient-text">مدیریت کاربران</h1>
            <p className="text-xs sm:text-sm text-muted-foreground">مدیریت کاربران و نقش‌ها</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <User className="h-4 w-4 sm:h-5 sm:w-5" />
              لیست کاربران ({users.length})
            </CardTitle>
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
                    <TableHead className="text-xs sm:text-sm text-left">عملیات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="text-xs sm:text-sm font-medium">
                        {user.full_name || 'بدون نام'}
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
                                آیا مطمئن هستید که می‌خواهید این کاربر را حذف کنید؟ این عملیات قابل بازگشت نیست.
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

            {users.length === 0 && (
              <div className="text-center py-8 sm:py-12 text-muted-foreground">
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
