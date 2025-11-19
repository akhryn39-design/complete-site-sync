import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import ChatSidebar from '@/components/ChatSidebar';
import ChatMessage from '@/components/ChatMessage';
import ChatInput from '@/components/ChatInput';
import AdDisplay from '@/components/AdDisplay';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { FileDown, Loader2, Menu, BookOpen, Newspaper } from 'lucide-react';
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
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    checkAuth();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user);
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
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate('/auth');
    } else {
      setUser(session.user);
    }
  };

  const subscribeToMessages = () => {
    const channel = supabase
      .channel('messages')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${currentConversationId}`
      }, () => {
        loadMessages();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const loadMessages = async () => {
    if (!currentConversationId) return;
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', currentConversationId)
      .order('created_at', { ascending: true });

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
        await supabase
          .from('conversations')
          .update({ updated_at: new Date().toISOString() })
          .eq('id', currentConversationId);
      }

      const { data, error } = await supabase
        .from('conversations')
        .insert([{ user_id: user.id, title: 'گفتگوی جدید' }])
        .select()
        .single();

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
      const { error: messageError } = await supabase
        .from('messages')
        .insert([{
          conversation_id: conversationId,
          role: 'user',
          content,
          image_url: imageUrl
        }]);

      if (messageError) throw messageError;

      const { error: aiError } = await supabase
        .from('messages')
        .insert([{
          conversation_id: conversationId,
          role: 'assistant',
          content: 'سلام! من دستیار هوشمند شما هستم. چطور می‌توانم کمکتان کنم؟'
        }]);

      if (aiError) throw aiError;

      if (messages.length === 0) {
        await supabase
          .from('conversations')
          .update({ title: content.substring(0, 50) })
          .eq('id', conversationId);
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

  return (
    <div className="flex h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <ChatSidebar
        currentConversationId={currentConversationId}
        onConversationSelect={setCurrentConversationId}
        onNewConversation={createNewConversation}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
      />

      <div className="flex-1 flex flex-col">
        <div className="flex items-center justify-between p-4 border-b bg-card/50 backdrop-blur">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="md:hidden"
            >
              <Menu className="h-5 w-5" />
            </Button>
            <h2 className="text-lg font-bold gradient-text">چت هوشمند پیام‌نور</h2>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/materials')}
              className="gap-2"
            >
              <BookOpen className="h-4 w-4" />
              مواد آموزشی
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/news')}
              className="gap-2"
            >
              <Newspaper className="h-4 w-4" />
              اخبار
            </Button>
            {messages.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={exportToPDF}
                className="gap-2"
              >
                <FileDown className="h-4 w-4" />
                خروجی PDF
              </Button>
            )}
          </div>
        </div>

        <AdDisplay position="chat_top" />

        <ScrollArea className="flex-1 p-4">
          {loading && messages.length === 0 && (
            <div className="flex justify-center items-center h-full">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}

          {messages.length === 0 && !loading && (
            <div className="flex flex-col items-center justify-center h-full text-center p-8">
              <h3 className="text-2xl font-bold mb-2">به چت هوشمند خوش آمدید!</h3>
              <p className="text-muted-foreground">
                سوال خود را بپرسید یا فایل آپلود کنید
              </p>
            </div>
          )}

          <div className="space-y-4">
            {messages.map((message) => (
              <ChatMessage
                key={message.id}
                id={message.id}
                role={message.role}
                content={message.content}
                imageUrl={message.image_url}
                onUpdate={loadMessages}
              />
            ))}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        <AdDisplay position="chat_bottom" />

        <ChatInput onSendMessage={handleSendMessage} loading={loading} />
      </div>
    </div>
  );
};

export default Chat;