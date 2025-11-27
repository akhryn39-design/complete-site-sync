import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';
import { Input } from './ui/input';
import { Plus, MessageSquare, LogOut, User, Search, Moon, Sun, X, Trash2, Shield, Edit2 } from 'lucide-react';
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
  const [supportTelegram, setSupportTelegram] = useState('@Heart83frozen');
  const [isEditingSupport, setIsEditingSupport] = useState(false);
  const [editedSupport, setEditedSupport] = useState('@Heart83frozen');
  const { toast } = useToast();
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    loadConversations();
    loadProfile();
    checkAdminStatus();
    loadSupportSetting();
  }, []);

  const loadSupportSetting = async () => {
    const { data } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'support_telegram')
      .single();
    
    if (data?.value) {
      const val = typeof data.value === 'string' ? data.value.replace(/"/g, '') : String(data.value);
      setSupportTelegram(val);
      setEditedSupport(val);
    }
  };

  const handleUpdateSupport = async () => {
    const { error } = await supabase
      .from('system_settings')
      .update({ value: `"${editedSupport}"` })
      .eq('key', 'support_telegram');

    if (error) {
      toast({
        title: 'خطا در ویرایش',
        description: error.message,
        variant: 'destructive'
      });
      return;
    }

    toast({
      title: '✅ ذخیره شد',
      description: 'آیدی پشتیبانی با موفقیت تغییر یافت'
    });
    setSupportTelegram(editedSupport);
    setIsEditingSupport(false);
  };

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

  const handleDeleteConversation = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('آیا مطمئن هستید که می‌خواهید این گفتگو را حذف کنید؟')) return;

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
      title: '🗑️ حذف شد',
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
          className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm"
          onClick={onToggle}
        />
      )}

      <div
        className={`fixed md:relative inset-y-0 right-0 w-80 bg-sidebar border-l border-border/50 flex flex-col transition-transform duration-300 z-50 ${
          isOpen ? 'translate-x-0' : 'translate-x-full md:translate-x-0'
        }`}
      >
        <div className="p-4 border-b border-border/50 bg-gradient-to-br from-sidebar-primary to-sidebar-primary/90 text-sidebar-primary-foreground">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              {isEditingName ? (
                <div className="flex items-center gap-2">
                  <Input
                    value={editedName}
                    onChange={(e) => setEditedName(e.target.value)}
                    className="h-8 text-sm bg-background/10 border-border/30 text-foreground"
                  />
                  <Button size="sm" onClick={handleUpdateName} className="h-8 px-2">✓</Button>
                  <Button size="sm" variant="ghost" onClick={() => setIsEditingName(false)} className="h-8 px-2">✗</Button>
                </div>
              ) : (
                <>
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                    <User className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-semibold">{profile?.full_name || 'کاربر'}</div>
                    <Button
                      variant="link"
                      size="sm"
                      className="h-auto p-0 text-xs text-sidebar-primary-foreground/80 hover:text-sidebar-primary-foreground"
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
                className="h-8 w-8 hover:bg-sidebar-primary-foreground/10"
              >
                {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={onToggle}
                className="h-8 w-8 md:hidden hover:bg-sidebar-primary-foreground/10"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <Button
            onClick={onNewConversation}
            className="w-full gap-2 bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 shadow-md hover:shadow-lg transition-all"
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
              placeholder="جستجو در گفتگوها..."
              className="pr-10 bg-background/50 border-border/50"
            />
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-3 space-y-2">
            {filteredConversations.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                گفتگویی یافت نشد
              </div>
            ) : (
              filteredConversations.map((conv) => (
                <div
                  key={conv.id}
                  className={`group flex items-center gap-2 p-3 rounded-xl cursor-pointer transition-all duration-200 ${
                    currentConversationId === conv.id
                      ? 'bg-gradient-to-r from-primary/20 to-secondary/20 border border-primary/30 shadow-sm'
                      : 'hover:bg-sidebar-accent/50 border border-transparent'
                  }`}
                  onClick={() => {
                    onConversationSelect(conv.id);
                    if (window.innerWidth < 768) onToggle();
                  }}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    currentConversationId === conv.id 
                      ? 'bg-gradient-to-br from-primary to-secondary' 
                      : 'bg-muted'
                  }`}>
                    <MessageSquare className={`w-4 h-4 ${currentConversationId === conv.id ? 'text-primary-foreground' : 'text-muted-foreground'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate font-medium">{conv.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(conv.created_at).toLocaleDateString('fa-IR')}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all flex-shrink-0"
                    onClick={(e) => handleDeleteConversation(conv.id, e)}
                    title="حذف گفتگو"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))
            )}
          </div>

          <div className="p-3">
            <NewsDisplay />
          </div>

          <AdDisplay position="sidebar" />
        </ScrollArea>

        <div className="p-4 border-t border-border/50 space-y-2">
          <div className="p-3 rounded-xl bg-gradient-to-br from-primary/5 via-secondary/5 to-accent/5 border border-primary/20 mb-2">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-muted-foreground">📞 پشتیبانی</p>
              {isAdmin && !isEditingSupport && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-muted-foreground hover:text-primary"
                  onClick={() => setIsEditingSupport(true)}
                  title="ویرایش آیدی پشتیبانی"
                >
                  <Edit2 className="h-3 w-3" />
                </Button>
              )}
            </div>
            {isEditingSupport ? (
              <div className="flex items-center gap-2">
                <Input
                  value={editedSupport}
                  onChange={(e) => setEditedSupport(e.target.value)}
                  className="h-8 text-sm bg-background/50"
                  placeholder="@username"
                />
                <Button size="sm" onClick={handleUpdateSupport} className="h-8 px-2">✓</Button>
                <Button size="sm" variant="ghost" onClick={() => setIsEditingSupport(false)} className="h-8 px-2">✗</Button>
              </div>
            ) : (
              <a
                href={`https://t.me/${supportTelegram.replace('@', '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium text-primary hover:text-secondary transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69.01-.03.01-.14-.07-.2-.08-.06-.19-.04-.27-.02-.12.02-1.96 1.25-5.54 3.67-.52.36-.99.53-1.42.52-.47-.01-1.37-.26-2.03-.48-.82-.27-1.47-.42-1.42-.88.03-.24.37-.48 1.02-.73 4-1.74 6.68-2.88 8.03-3.43 3.82-1.59 4.61-1.87 5.13-1.88.11 0 .37.03.54.17.14.12.18.28.2.39.02.11.04.35.02.54z"/>
                </svg>
                {supportTelegram}
              </a>
            )}
          </div>

          {isAdmin && (
            <Dialog open={showAdminPanel} onOpenChange={setShowAdminPanel}>
              <DialogTrigger asChild>
                <Button variant="outline" className="w-full gap-2 border-primary/30 hover:bg-primary/10 hover:border-primary/50">
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
            className="w-full gap-2 border-destructive/30 hover:bg-destructive/10 hover:border-destructive/50 hover:text-destructive transition-all"
          >
            <LogOut className="w-4 h-4" />
            خروج از حساب
          </Button>
        </div>
      </div>
    </>
  );
};

export default ChatSidebar;
