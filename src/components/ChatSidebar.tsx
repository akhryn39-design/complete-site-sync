import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';
import { Input } from './ui/input';
import { Plus, MessageSquare, LogOut, User, Search, Moon, Sun, X, Trash2, Settings, Shield } from 'lucide-react';
import { useToast } from './ui/use-toast';
import { useNavigate } from 'react-router-dom';
import { useTheme } from 'next-themes';
import AdDisplay from './AdDisplay';
import { NewsDisplay } from './NewsDisplay';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { AdminPanel } from './AdminPanel';

interface Conversation {
  id: string;
  title: string;
  created_at: string;
}

interface ChatSidebarProps {
  currentConversationId: string | null;
  onConversationSelect: (id: string) => void;
  onNewConversation: () => void;
  isOpen: boolean;
  onToggle: () => void;
}

const ChatSidebar = ({
  currentConversationId,
  onConversationSelect,
  onNewConversation,
  isOpen,
  onToggle
}: ChatSidebarProps) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    loadConversations();
    loadProfile();
    checkAdminStatus();
  }, []);

  const checkAdminStatus = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .single();
      setIsAdmin(!!data);
    }
  };

  const loadProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      setProfile(data);
      setEditedName(data?.full_name || 'کاربر');
    }
  };

  const handleUpdateName = async () => {
    if (!profile) return;
    const { error } = await supabase
      .from('profiles')
      .update({ full_name: editedName })
      .eq('id', profile.id);

    if (error) {
      toast({
        title: 'خطا در ویرایش نام',
        description: error.message,
        variant: 'destructive'
      });
      return;
    }

    toast({
      title: '✅ نام ویرایش شد',
      description: 'نام شما با موفقیت تغییر یافت'
    });
    setIsEditingName(false);
    loadProfile();
  };

  const loadConversations = async () => {
    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .order('updated_at', { ascending: false });

    if (error) {
      toast({
        title: 'خطا در بارگذاری مکالمات',
        description: error.message,
        variant: 'destructive'
      });
      return;
    }
    setConversations(data || []);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast({
      title: 'خروج موفق',
      description: 'با موفقیت از حساب خود خارج شدید'
    });
    navigate('/auth');
  };

  const handleDeleteConversation = async (id: string) => {
    if (!confirm('آیا مطمئن هستید؟')) return;

    const { error } = await supabase
      .from('conversations')
      .delete()
      .eq('id', id);

    if (error) {
      toast({
        title: 'خطا در حذف',
        description: error.message,
        variant: 'destructive'
      });
      return;
    }

    toast({
      title: 'حذف شد',
      description: 'گفتگو با موفقیت حذف شد'
    });

    if (currentConversationId === id) {
      onNewConversation();
    }
    loadConversations();
  };

  const filteredConversations = conversations.filter(conv =>
    conv.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={onToggle}
        />
      )}

      <div
        className={`fixed md:relative inset-y-0 right-0 w-80 bg-sidebar border-l flex flex-col transition-transform duration-300 z-50 ${
          isOpen ? 'translate-x-0' : 'translate-x-full md:translate-x-0'
        }`}
      >
        <div className="p-4 border-b bg-sidebar-primary text-sidebar-primary-foreground">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              {isEditingName ? (
                <div className="flex items-center gap-2">
                  <Input
                    value={editedName}
                    onChange={(e) => setEditedName(e.target.value)}
                    className="h-8 text-sm"
                  />
                  <Button size="sm" onClick={handleUpdateName}>✓</Button>
                  <Button size="sm" variant="ghost" onClick={() => setIsEditingName(false)}>✗</Button>
                </div>
              ) : (
                <>
                  <User className="w-5 h-5" />
                  <div>
                    <div className="font-semibold">{profile?.full_name || 'کاربر'}</div>
                    <Button
                      variant="link"
                      size="sm"
                      className="h-auto p-0 text-xs text-sidebar-primary-foreground/80"
                      onClick={() => setIsEditingName(true)}
                    >
                      ویرایش نام
                    </Button>
                  </div>
                </>
              )}
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="h-8 w-8"
              >
                {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={onToggle}
                className="h-8 w-8 md:hidden"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <Button
            onClick={onNewConversation}
            className="w-full gap-2"
            variant="secondary"
          >
            <Plus className="w-4 h-4" />
            گفتگوی جدید
          </Button>
        </div>

        <div className="p-3">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="جستجو..."
              className="pr-10"
            />
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-3 space-y-2">
            {filteredConversations.map((conv) => (
              <div
                key={conv.id}
                className={`group flex items-center gap-2 p-3 rounded-lg cursor-pointer transition-colors ${
                  currentConversationId === conv.id
                    ? 'bg-sidebar-accent'
                    : 'hover:bg-sidebar-accent/50'
                }`}
                onClick={() => {
                  onConversationSelect(conv.id);
                  if (window.innerWidth < 768) onToggle();
                }}
              >
                <MessageSquare className="w-4 h-4 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate">{conv.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(conv.created_at).toLocaleDateString('fa-IR')}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 opacity-0 group-hover:opacity-100"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteConversation(conv.id);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>

          <div className="p-3">
            <NewsDisplay />
          </div>

          <AdDisplay position="sidebar" />
        </ScrollArea>

        <div className="p-4 border-t space-y-2">
          {isAdmin && (
            <Dialog open={showAdminPanel} onOpenChange={setShowAdminPanel}>
              <DialogTrigger asChild>
                <Button variant="outline" className="w-full gap-2">
                  <Shield className="w-4 h-4" />
                  پنل مدیریت
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-6xl h-[90vh]">
                <DialogHeader>
                  <DialogTitle>پنل مدیریت</DialogTitle>
                </DialogHeader>
                <AdminPanel />
              </DialogContent>
            </Dialog>
          )}

          <Button
            variant="outline"
            onClick={handleSignOut}
            className="w-full gap-2"
          >
            <LogOut className="w-4 h-4" />
            خروج
          </Button>
        </div>
      </div>
    </>
  );
};

export default ChatSidebar;