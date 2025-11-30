import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import ChatSidebar from '@/components/ChatSidebar';
import ChatMessage from '@/components/ChatMessage';
import ChatInput from '@/components/ChatInput';
import AdDisplay from '@/components/AdDisplay';
import { ChatModeToggle } from '@/components/ChatModeToggle';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { FileDown, Loader2, Menu, MessageSquare, Search, ImageIcon, BookOpen, Newspaper, Shield, User, Paperclip, Mic } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAILimits } from '@/hooks/useAILimits';
import jsPDF from 'jspdf';
interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  image_url?: string | null;
  created_at: string;
}
const Chat = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { remainingMessages, canSendMessage, incrementUsage, refreshLimits } = useAILimits();
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [chatMode, setChatMode] = useState<'ai' | 'search'>('ai');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    checkAuth();
    const {
      data: {
        subscription
      }
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user);
        checkAdminRole(session.user.id);
      } else {
        navigate('/auth');
      }
    });
    return () => subscription.unsubscribe();
  }, [navigate]);
  useEffect(() => {
    if (!currentConversationId) return;
    loadMessages();
    const unsubscribe = subscribeToMessages();
    return () => {
      unsubscribe?.();
    };
  }, [currentConversationId]);
  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({
      behavior: 'smooth'
    });
  };
  const checkAuth = async () => {
    const {
      data: {
        session
      }
    } = await supabase.auth.getSession();
    if (!session) {
      navigate('/auth');
    } else {
      setUser(session.user);
      checkAdminRole(session.user.id);
    }
  };
  const checkAdminRole = async (userId: string) => {
    try {
      const {
        data,
        error
      } = await supabase.rpc('has_role', {
        _user_id: userId,
        _role: 'admin'
      });
      if (!error) {
        setIsAdmin(data === true);
      }
    } catch (error) {
      console.error('Error checking admin role:', error);
    }
  };
  const subscribeToMessages = () => {
    const channel = supabase.channel('messages').on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'messages',
      filter: `conversation_id=eq.${currentConversationId}`
    }, () => {
      loadMessages();
    }).subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  };
  const loadMessages = async () => {
    if (!currentConversationId) return;
    const {
      data,
      error
    } = await supabase.from('messages').select('*').eq('conversation_id', currentConversationId).order('created_at', {
      ascending: true
    });
    if (error) {
      toast({
        title: 'خطا در بارگذاری پیام‌ها',
        description: error.message,
        variant: 'destructive'
      });
      return;
    }
    setMessages((data || []) as Message[]);
  };
  const createNewConversation = async (): Promise<string | null> => {
    if (!user) return null;
    try {
      if (currentConversationId) {
        await supabase.from('conversations').update({
          updated_at: new Date().toISOString()
        }).eq('id', currentConversationId);
      }
      const {
        data,
        error
      } = await supabase.from('conversations').insert([{
        user_id: user.id,
        title: 'گفتگوی جدید'
      }]).select().single();
      if (error) throw error;
      setCurrentConversationId(data.id);
      setMessages([]);
      toast({
        title: 'گفتگوی جدید',
        description: 'گفتگوی جدید ایجاد شد'
      });
      return data.id;
    } catch (error: any) {
      toast({
        title: 'خطا در ایجاد گفتگو',
        description: error.message,
        variant: 'destructive'
      });
      return null;
    }
  };
  const handleRegenerateResponse = async (messageContent: string, messageId: string) => {
    if (!currentConversationId) return;
    setLoading(true);
    try {
      // Get all messages up to and including the edited message
      const {
        data: allMessages
      } = await supabase.from('messages').select('*').eq('conversation_id', currentConversationId).order('created_at', {
        ascending: true
      });
      if (!allMessages) return;
      const messageIndex = allMessages.findIndex(m => m.id === messageId);
      const relevantMessages = allMessages.slice(0, messageIndex + 1);

      // Get AI response with streaming
      const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat-ai`;
      const resp = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
        },
        body: JSON.stringify({
          messages: relevantMessages.map(m => ({
            role: m.role,
            content: m.content,
            ...(m.image_url && {
              image_url: m.image_url,
              type: 'image_url'
            })
          })),
          userId: user?.id
        })
      });
      if (!resp.ok || !resp.body) {
        let errText = 'خطا در دریافت پاسخ';
        try {
          const errorData = await resp.json();
          if (errorData.error) {
            errText = errorData.error;
            // Show specific error messages for rate limits and credits
            if (resp.status === 429 || resp.status === 402) {
              toast({
                title: resp.status === 429 ? 'محدودیت تعداد درخواست' : 'اعتبار تمام شده',
                description: errText,
                variant: 'destructive',
              });
              return;
            }
          }
        } catch {}
        throw new Error(errText);
      }

      // Create temporary AI message
      const tempMessageId = crypto.randomUUID();
      let fullResponse = '';

      // Process streaming response
      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = '';
      let streamDone = false;
      while (!streamDone) {
        const {
          done,
          value
        } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, {
          stream: true
        });
        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);
          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') {
            streamDone = true;
            break;
          }
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              fullResponse += content;
              setMessages(prev => {
                const exists = prev.find(m => m.id === tempMessageId);
                if (exists) {
                  return prev.map(m => m.id === tempMessageId ? {
                    ...m,
                    content: fullResponse
                  } : m);
                }
                return [...prev, {
                  id: tempMessageId,
                  role: 'assistant' as const,
                  content: fullResponse,
                  created_at: new Date().toISOString()
                }];
              });
            }
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }

      // Save final AI response to database
      if (fullResponse) {
        await supabase.from('messages').insert([{
          conversation_id: currentConversationId,
          role: 'assistant',
          content: fullResponse
        }]);
      }
    } catch (error: any) {
      toast({
        title: 'خطا در دریافت پاسخ جدید',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };
  const handleSendMessage = async (content: string, imageUrl?: string, fileUrl?: string) => {
    // Check AI limits if in AI mode
    if (chatMode === 'ai' && !canSendMessage) {
      toast({
        title: 'محدودیت روزانه',
        description: 'محدودیت روزانه شما تمام شده است. فردا دوباره تلاش کنید.',
        variant: 'destructive'
      });
      return;
    }

    let conversationId = currentConversationId;
    if (!conversationId) {
      conversationId = await createNewConversation();
      if (!conversationId) return;
    }

    setLoading(true);

    try {
      // Add user message
      const { data: insertedMessage, error: messageError } = await supabase
        .from('messages')
        .insert([{
          conversation_id: conversationId,
          role: 'user',
          content,
          image_url: imageUrl
        }])
        .select()
        .single();

      if (messageError) throw messageError;
      if (insertedMessage) {
        setMessages(prev => [...prev, insertedMessage as Message]);
      }

      // Handle search mode
      if (chatMode === 'search') {
        const { data: materials } = await supabase
          .from('educational_materials')
          .select('*')
          .or(`title.ilike.%${content}%,description.ilike.%${content}%,category.ilike.%${content}%`)
          .limit(10);

        let searchResult = '📚 **نتایج جستجو:**\n\n';
        if (!materials || materials.length === 0) {
          searchResult += 'هیچ نتیجه‌ای یافت نشد. لطفاً کلمات کلیدی دیگری امتحان کنید.';
        } else {
          const storageBaseUrl = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/educational-files`;
          materials.forEach((m, i) => {
            const encodedPath = encodeURIComponent(m.file_path).replace(/%2F/g, '/');
            const downloadUrl = `${storageBaseUrl}/${encodedPath}`;
            searchResult += `${i + 1}. **${m.title}**\n`;
            searchResult += `   📁 دسته: ${m.category}\n`;
            if (m.description) searchResult += `   📝 ${m.description}\n`;
            searchResult += `   🔗 ${downloadUrl}\n\n`;
          });
        }

        // Save search result as assistant message
        const { error: assistantError } = await supabase
          .from('messages')
          .insert([{
            conversation_id: conversationId,
            role: 'assistant',
            content: searchResult
          }]);

        if (assistantError) throw assistantError;
        await loadMessages();
        setLoading(false);
        return;
      }

      // Increment AI usage
      const canProceed = await incrementUsage();
      if (!canProceed) {
        setLoading(false);
        return;
      }

      // Get AI response with streaming
      const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat-ai`;
      const resp = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
        },
        body: JSON.stringify({
          messages: messages.map(m => ({
            role: m.role,
            content: m.content,
            ...(m.image_url && {
              image_url: m.image_url,
              type: 'image_url'
            })
          })).concat([{
            role: 'user',
            content,
            ...(imageUrl && {
              image_url: imageUrl,
              type: 'image_url'
            })
          }]),
          userId: user?.id
        })
      });
      if (!resp.ok || !resp.body) {
        let errText = 'خطا در دریافت پاسخ';
        try {
          const errorData = await resp.json();
          if (errorData.error) {
            errText = errorData.error;
            // Show specific error messages for rate limits and credits
            if (resp.status === 429 || resp.status === 402) {
              toast({
                title: resp.status === 429 ? 'محدودیت تعداد درخواست' : 'اعتبار تمام شده',
                description: errText,
                variant: 'destructive',
              });
              return;
            }
          }
        } catch {}
        throw new Error(errText);
      }

      // Create temporary AI message
      const tempMessageId = crypto.randomUUID();
      let fullResponse = '';

      // Process streaming response
      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = '';
      let streamDone = false;
      while (!streamDone) {
        const {
          done,
          value
        } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, {
          stream: true
        });
        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);
          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') {
            streamDone = true;
            break;
          }
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              fullResponse += content;
              // Update messages in real-time
              setMessages(prev => {
                const exists = prev.find(m => m.id === tempMessageId);
                if (exists) {
                  return prev.map(m => m.id === tempMessageId ? {
                    ...m,
                    content: fullResponse
                  } : m);
                }
                return [...prev, {
                  id: tempMessageId,
                  role: 'assistant' as const,
                  content: fullResponse,
                  created_at: new Date().toISOString()
                }];
              });
            }
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }

      // Save final AI response to database
      if (fullResponse) {
        await supabase.from('messages').insert([{
          conversation_id: conversationId,
          role: 'assistant',
          content: fullResponse
        }]);
      }
      if (messages.length === 0) {
        await supabase.from('conversations').update({
          title: content.substring(0, 50)
        }).eq('id', conversationId);
      }
    } catch (error: any) {
      toast({
        title: 'خطا در ارسال پیام',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };
  const exportToPDF = () => {
    const doc = new jsPDF();
    let yPosition = 20;
    messages.forEach((msg, index) => {
      const role = msg.role === 'user' ? 'شما' : 'دستیار';
      doc.text(`${role}: ${msg.content}`, 10, yPosition);
      yPosition += 10;
      if (yPosition > 280) {
        doc.addPage();
        yPosition = 20;
      }
    });
    doc.save('chat-export.pdf');
    toast({
      title: 'خروجی گرفته شد',
      description: 'گفتگو به صورت PDF ذخیره شد'
    });
  };
  return <div className="flex h-screen bg-gradient-to-br from-background via-background to-background overflow-hidden relative">
      <div className="absolute inset-0 bg-[var(--gradient-mesh)] pointer-events-none opacity-40" />
      
      <ChatSidebar currentConversationId={currentConversationId} onConversationSelect={setCurrentConversationId} onNewConversation={createNewConversation} isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />

      <div className="flex-1 flex flex-col min-w-0 relative z-10">
        <div className="flex items-center justify-between p-2 sm:p-3 md:p-4 border-b border-border/50 bg-card/80 backdrop-blur-xl">
          <div className="flex items-center gap-1 sm:gap-2 min-w-0">
            <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(!sidebarOpen)} className="md:hidden flex-shrink-0 h-8 w-8 sm:h-9 sm:w-9 hover:bg-primary/10 transition-colors">
              <Menu className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-gradient-to-r from-primary to-secondary animate-pulse" />
              <h2 className="text-base sm:text-lg md:text-xl font-bold gradient-text truncate">As </h2>
            </div>
          </div>

          <div className="flex gap-1 flex-shrink-0">
            {isAdmin && <>
                <Button variant="outline" size="sm" onClick={() => navigate('/admin')} className="gap-1 h-8 px-2 sm:h-9 sm:px-3 hover:bg-primary/10 hover:border-primary/50 transition-all">
                  <Shield className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline text-xs sm:text-sm">پنل</span>
                </Button>
                <Button variant="outline" size="sm" onClick={() => navigate('/users')} className="gap-1 h-8 px-2 sm:h-9 sm:px-3 hover:bg-secondary/10 hover:border-secondary/50 transition-all">
                  <User className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline text-xs sm:text-sm">کاربران</span>
                </Button>
              </>}
            <Button variant="outline" size="sm" onClick={() => navigate('/materials')} className="gap-1 h-8 px-2 sm:h-9 sm:px-3 hover:bg-accent/10 hover:border-accent/50 transition-all">
              <BookOpen className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline text-xs sm:text-sm">مواد</span>
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate('/news')} className="gap-1 h-8 px-2 sm:h-9 sm:px-3 hover:bg-accent/10 hover:border-accent/50 transition-all">
              <Newspaper className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline text-xs sm:text-sm">اخبار</span>
            </Button>
            
            {messages.length > 0}
          </div>
        </div>

        <AdDisplay position="chat_top" />

        <ScrollArea className="flex-1 p-3 sm:p-4 md:p-6">
          {loading && messages.length === 0 && (
            <div className="flex justify-center items-center h-full">
              <div className="relative">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <div className="absolute inset-0 h-10 w-10 rounded-full border-4 border-primary/20 animate-pulse" />
              </div>
            </div>
          )}

          {messages.length === 0 && !loading && (
            <div className="flex flex-col items-center justify-center h-full text-center p-4 sm:p-6 md:p-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
              {/* Enhanced welcome icon */}
              <div className="mb-8 relative">
                <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-primary via-secondary to-accent flex items-center justify-center shadow-elegant animate-float">
                  <MessageSquare className="w-12 h-12 text-white drop-shadow-lg" />
                </div>
                <div className="absolute -inset-2 bg-gradient-to-br from-primary/60 via-secondary/40 to-accent/30 rounded-3xl blur-2xl opacity-70 -z-10 animate-pulse-glow" />
                
                {/* Decorative sparkles */}
                <div className="absolute -top-2 -right-2 w-4 h-4 bg-primary rounded-full animate-pulse shadow-glow" />
                <div className="absolute -bottom-2 -left-2 w-3 h-3 bg-secondary rounded-full animate-bounce" style={{ animationDelay: '0.3s' }} />
                <div className="absolute top-0 left-0 w-2 h-2 bg-accent rounded-full animate-pulse" style={{ animationDelay: '0.6s' }} />
              </div>
              
              <h3 className="text-2xl sm:text-3xl md:text-4xl font-decorative mb-4 gradient-text drop-shadow-lg animate-in zoom-in duration-500" style={{ animationDelay: '0.1s' }}>
                خوش آمدید به دستیار هوشمند
              </h3>
              <p className="text-sm sm:text-base md:text-lg text-muted-foreground max-w-xl mb-8 leading-relaxed animate-in fade-in duration-500" style={{ animationDelay: '0.2s' }}>
                می‌توانید سوال بپرسید، تصویر بفرستید، فایل آپلود کنید یا با صدا صحبت کنید
              </p>
              
              {/* Enhanced feature cards */}
              <div className="grid grid-cols-2 gap-4 max-w-lg w-full animate-in fade-in slide-in-from-bottom-4 duration-500" style={{ animationDelay: '0.3s' }}>
                <div className="group p-4 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/30 hover:border-primary/50 hover:bg-primary/15 hover:scale-105 hover:shadow-lg transition-all duration-300 cursor-pointer">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary to-primary-hover flex items-center justify-center mb-2 group-hover:rotate-12 transition-transform duration-300 shadow-md">
                    <ImageIcon className="w-4 h-4 text-white" />
                  </div>
                  <p className="text-sm font-bold text-primary">ارسال تصویر</p>
                  <p className="text-xs text-muted-foreground mt-1">تحلیل و پاسخ به تصاویر</p>
                </div>
                
                <div className="group p-4 rounded-2xl bg-gradient-to-br from-secondary/10 to-secondary/5 border border-secondary/30 hover:border-secondary/50 hover:bg-secondary/15 hover:scale-105 hover:shadow-lg transition-all duration-300 cursor-pointer">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-secondary to-secondary-hover flex items-center justify-center mb-2 group-hover:rotate-12 transition-transform duration-300 shadow-md">
                    <Paperclip className="w-4 h-4 text-white" />
                  </div>
                  <p className="text-sm font-bold text-secondary">آپلود فایل</p>
                  <p className="text-xs text-muted-foreground mt-1">پردازش اسناد و فایل‌ها</p>
                </div>
                
                <div className="group p-4 rounded-2xl bg-gradient-to-br from-accent/10 to-accent/5 border border-accent/30 hover:border-accent/50 hover:bg-accent/15 hover:scale-105 hover:shadow-lg transition-all duration-300 cursor-pointer">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-accent to-accent-hover flex items-center justify-center mb-2 group-hover:rotate-12 transition-transform duration-300 shadow-md">
                    <Mic className="w-4 h-4 text-white" />
                  </div>
                  <p className="text-sm font-bold text-accent">پیام صوتی</p>
                  <p className="text-xs text-muted-foreground mt-1">گفتگو با صدا</p>
                </div>
                
                <div className="group p-4 rounded-2xl bg-gradient-to-br from-primary/10 to-accent/5 border border-primary/30 hover:border-accent/50 hover:bg-accent/15 hover:scale-105 hover:shadow-lg transition-all duration-300 cursor-pointer">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary via-secondary to-accent flex items-center justify-center mb-2 group-hover:rotate-12 transition-transform duration-300 shadow-md">
                    <Search className="w-4 h-4 text-white" />
                  </div>
                  <p className="text-sm font-bold gradient-text">جستجو هوشمند</p>
                  <p className="text-xs text-muted-foreground mt-1">یافتن اطلاعات دقیق</p>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-3 sm:space-y-4 md:space-y-5 max-w-5xl mx-auto">
            {messages.map((message, index) => (
              <div 
                key={message.id} 
                className="animate-in fade-in slide-in-from-bottom-4 duration-300"
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <ChatMessage 
                  id={message.id} 
                  role={message.role} 
                  content={message.content} 
                  imageUrl={message.image_url} 
                  onUpdate={loadMessages} 
                  onRegenerateResponse={handleRegenerateResponse} 
                />
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        <AdDisplay position="chat_bottom" />

        <ChatInput 
          onSendMessage={handleSendMessage} 
          loading={loading} 
          mode={chatMode}
          remainingMessages={remainingMessages}
        />
      </div>
    </div>;
};
export default Chat;