import { useState } from 'react';
import { Button } from './ui/button';
import { User, Copy, Check, Pencil, Trash2, FileDown, RefreshCw } from 'lucide-react';
import { ASIcon } from './icons/ASIcon';
import { useToast } from './ui/use-toast';
import { Textarea } from './ui/textarea';
import { supabase } from '@/integrations/supabase/client';

interface ChatMessageProps {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  imageUrl?: string | null;
  onUpdate: () => void;
  onRegenerateResponse?: (messageContent: string, messageId: string) => void;
}

const ChatMessage = ({ id, role, content, imageUrl, onUpdate, onRegenerateResponse }: ChatMessageProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(content);
  const [copied, setCopied] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const { toast } = useToast();
  const isUser = role === 'user';

  const renderContent = (text: string) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(urlRegex);
    return parts.map((part, i) => {
      if (part.startsWith('http://') || part.startsWith('https://')) {
        const isDownloadLink = part.includes('supabase.co/storage') ||
                               part.includes('educational-files') ||
                               part.endsWith('.pdf') ||
                               part.endsWith('.doc') ||
                               part.endsWith('.docx') ||
                               part.endsWith('.ppt') ||
                               part.endsWith('.pptx');

        return (
          <a
            key={i}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex items-center gap-2 px-4 py-2 my-1 rounded-xl font-bold transition-all duration-300 break-all ${
              isDownloadLink
                ? 'bg-gradient-to-r from-primary via-secondary to-accent text-primary-foreground hover:shadow-elegant hover:scale-105 animate-pulse'
                : 'text-primary underline hover:text-secondary'
            }`}
          >
            {isDownloadLink && <FileDown className="w-4 h-4 flex-shrink-0" />}
            {isDownloadLink ? '📥 دانلود فایل - کلیک کنید' : part}
          </a>
        );
      }
      return <span key={i} className="whitespace-pre-wrap">{part}</span>;
    });
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({
      title: 'کپی شد',
      description: 'پیام با موفقیت کپی شد',
    });
  };

  const handleSave = async () => {
    const { data: currentMessage } = await supabase
      .from('messages')
      .select('conversation_id, created_at')
      .eq('id', id)
      .single();

    if (!currentMessage) return;

    const { error } = await supabase
      .from('messages')
      .update({ content: editedContent })
      .eq('id', id);

    if (error) {
      toast({
        title: 'خطا در ویرایش',
        description: error.message,
        variant: 'destructive',
      });
      return;
    }

    // If user edited their message, delete the following assistant message and regenerate
    if (isUser) {
      const { data: allMessages } = await supabase
        .from('messages')
        .select('id, role, created_at')
        .eq('conversation_id', currentMessage.conversation_id)
        .order('created_at', { ascending: true });

      if (allMessages) {
        const currentIndex = allMessages.findIndex(msg => msg.id === id);
        const nextMessage = allMessages[currentIndex + 1];

        if (nextMessage && nextMessage.role === 'assistant') {
          await supabase
            .from('messages')
            .delete()
            .eq('id', nextMessage.id);
        }
      }
    }

    toast({
      title: 'ویرایش شد',
      description: 'پیام با موفقیت ویرایش شد. پاسخ جدید در حال ایجاد است...',
    });
    setIsEditing(false);
    onUpdate();
    
    // Trigger AI regeneration after edit
    if (isUser && onRegenerateResponse) {
      onRegenerateResponse(editedContent, id);
    }
  };

  const handleDelete = async () => {
    const { error } = await supabase
      .from('messages')
      .delete()
      .eq('id', id);

    if (error) {
      toast({
        title: 'خطا در حذف',
        description: error.message,
        variant: 'destructive',
      });
      return;
    }

    toast({
      title: 'حذف شد',
      description: 'پیام با موفقیت حذف شد',
    });
    onUpdate();
  };

  return (
    <div
      className={`flex gap-3 p-4 rounded-2xl transition-all duration-300 ${
        isUser
          ? 'bg-gradient-to-br from-primary/10 via-primary/5 to-transparent ml-4 md:ml-12 border border-primary/20'
          : 'bg-gradient-to-br from-secondary/10 via-card/50 to-transparent mr-4 md:mr-12 border border-secondary/20'
      } hover:shadow-md`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-elegant ${
        isUser 
          ? 'bg-gradient-to-br from-primary to-primary-hover' 
          : 'bg-gradient-to-br from-card via-card to-secondary/10 backdrop-blur-sm border-2 border-secondary/30'
      }`}>
        {isUser ? <User className="w-5 h-5 text-primary-foreground" /> : <ASIcon className="w-7 h-7" />}
      </div>

      <div className="flex-1 min-w-0">
        {imageUrl && (
          <img src={imageUrl} alt="Uploaded" className="max-w-xs rounded-lg mb-2 shadow-md" />
        )}

        {isEditing ? (
          <div className="space-y-2">
            <Textarea
              value={editedContent}
              onChange={(e) => setEditedContent(e.target.value)}
              className="min-h-[100px] bg-background/50"
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSave} className="gap-1">
                <RefreshCw className="w-3 h-3" />
                ذخیره و دریافت پاسخ جدید
              </Button>
              <Button size="sm" variant="outline" onClick={() => setIsEditing(false)}>لغو</Button>
            </div>
          </div>
        ) : (
          <div className="prose prose-sm max-w-none text-foreground leading-relaxed">
            {renderContent(content)}
          </div>
        )}

        {showActions && !isEditing && (
          <div className="flex gap-1 mt-3 animate-in fade-in duration-200">
            <Button
              size="sm"
              variant="ghost"
              onClick={handleCopy}
              className="h-7 px-2 text-xs hover:bg-primary/10"
            >
              {copied ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
            </Button>
            {isUser && (
              <>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setIsEditing(true)}
                  className="h-7 px-2 text-xs hover:bg-secondary/10"
                >
                  <Pencil className="w-3 h-3" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleDelete}
                  className="h-7 px-2 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatMessage;
