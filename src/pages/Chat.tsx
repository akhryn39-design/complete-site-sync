import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import ChatSidebar from '@/components/ChatSidebar';
import ChatMessage from '@/components/ChatMessage';
import ChatInput from '@/components/ChatInput';
import AdDisplay from '@/components/AdDisplay';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { FileDown, Loader2, Menu, MessageSquare, Search, ImageIcon, BookOpen, Newspaper, Shield } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
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
  const {
    toast
  } = useToast();
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
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
  const handleSendMessage = async (content: string, imageUrl?: string, fileUrl?: string) => {
    let conversationId = currentConversationId;
    if (!conversationId) {
      conversationId = await createNewConversation();
      if (!conversationId) return;
    }
    setLoading(true);
    try {
      // Add user message
      const {
        error: messageError
      } = await supabase.from('messages').insert([{
        conversation_id: conversationId,
        role: 'user',
        content,
        image_url: imageUrl
      }]);
      if (messageError) throw messageError;

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
          errText = errorData.error || errText;
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
  return <div className="flex h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <ChatSidebar currentConversationId={currentConversationId} onConversationSelect={setCurrentConversationId} onNewConversation={createNewConversation} isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />

      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex items-center justify-between p-3 md:p-4 border-b bg-card/50 backdrop-blur">
          <div className="flex items-center gap-2 min-w-0">
            <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(!sidebarOpen)} className="md:hidden flex-shrink-0">
              <Menu className="h-5 w-5" />
            </Button>
            <h2 className="text-sm md:text-lg font-bold gradient-text truncate">AS</h2>
          </div>

          <div className="flex gap-1 md:gap-2 flex-shrink-0">
            {isAdmin && <Button variant="outline" size="sm" onClick={() => navigate('/admin')} className="gap-1 md:gap-2">
                <Shield className="h-3 w-3 md:h-4 md:w-4" />
                <span className="hidden md:inline">مدیریت</span>
              </Button>}
            <Button variant="outline" size="sm" onClick={() => navigate('/materials')} className="gap-1 md:gap-2 hidden sm:flex">
              <BookOpen className="h-3 w-3 md:h-4 md:w-4" />
              <span className="hidden md:inline">مواد آموزشی</span>
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate('/news')} className="gap-1 md:gap-2 hidden sm:flex">
              <Newspaper className="h-3 w-3 md:h-4 md:w-4" />
              <span className="hidden md:inline">اخبار</span>
            </Button>
            
            {messages.length > 0 && <Button variant="outline" size="sm" onClick={exportToPDF} className="gap-1 md:gap-2">
                <FileDown className="h-3 w-3 md:h-4 md:w-4" />
                <span className="hidden md:inline">PDF</span>
              </Button>}
          </div>
        </div>

        <AdDisplay position="chat_top" />

        <ScrollArea className="flex-1 p-2 md:p-4">
          {loading && messages.length === 0 && <div className="flex justify-center items-center h-full">
              <Loader2 className="h-6 w-6 md:h-8 md:w-8 animate-spin text-primary" />
            </div>}

          {messages.length === 0 && !loading && <div className="flex flex-col items-center justify-center h-full text-center p-4 md:p-8">
              <h3 className="text-xl md:text-2xl font-bold mb-2">به چت هوشمند خوش آمدید!</h3>
              <p className="text-sm md:text-base text-muted-foreground">
                سوال خود را بپرسید یا فایل آپلود کنید
              </p>
            </div>}

          <div className="space-y-3 md:space-y-4 max-w-4xl mx-auto">
            {messages.map(message => <ChatMessage key={message.id} id={message.id} role={message.role} content={message.content} imageUrl={message.image_url} onUpdate={loadMessages} />)}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        <AdDisplay position="chat_bottom" />

        <ChatInput onSendMessage={handleSendMessage} loading={loading} />
      </div>
    </div>;
};
export default Chat;