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
    // Clean up markdown link syntax if AI accidentally used it
    let cleanText = text
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$2') // Replace [text](url) with just url
      .replace(/\]\(/g, '') // Remove stray ](
      .replace(/\)]/g, '') // Remove stray )]
      .replace(/\]https/g, 'https') // Fix ]https to https
      .replace(/pdf\]/g, 'pdf') // Remove trailing ] from pdf files
      .replace(/\)\s*$/gm, ''); // Remove trailing ) at end of lines
    
    const urlRegex = /(https?:\/\/[^\s\)\]<>"]+)/g;
    const parts = cleanText.split(urlRegex);
    
    return parts.map((part, i) => {
      if (part.startsWith('http://') || part.startsWith('https://')) {
        // Clean the URL - remove any trailing special characters
        let cleanUrl = part
          .replace(/[\]\)\[<>]+$/, '') // Remove trailing brackets
          .replace(/\s+$/, ''); // Remove trailing whitespace
        
        const isDownloadLink = cleanUrl.includes('supabase.co/storage') ||
                               cleanUrl.includes('educational-files') ||
                               cleanUrl.includes('chat-images') ||
                               /\.(pdf|doc|docx|ppt|pptx|xlsx|xls)($|\?)/i.test(cleanUrl);

        return (
          <a
            key={i}
            href={cleanUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex items-center gap-2 px-3 py-2 my-1 rounded-lg font-medium transition-all duration-300 ${
              isDownloadLink
                ? 'bg-gradient-to-r from-primary via-secondary to-accent text-primary-foreground hover:shadow-glow hover:scale-105 shadow-elegant text-sm'
                : 'text-primary underline decoration-2 hover:text-secondary'
            }`}
            style={{ wordBreak: 'break-all' }}
          >
            {isDownloadLink && <FileDown className="w-4 h-4 flex-shrink-0" />}
            {isDownloadLink ? '📥 دانلود فایل' : part}
          </a>
        );
      }
      return <span key={i}>{part}</span>;
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
      className={`group flex gap-3 sm:gap-4 p-3 sm:p-4 md:p-5 rounded-2xl sm:rounded-3xl transition-all duration-500 ${
        isUser
          ? 'bg-gradient-to-br from-primary/15 via-primary/8 to-transparent ml-2 sm:ml-4 md:ml-16 border border-primary/25 hover:border-primary/40 hover:shadow-elegant'
          : 'bg-gradient-to-br from-card via-card/90 to-secondary/5 mr-2 sm:mr-4 md:mr-16 border border-border/50 hover:border-secondary/30 hover:shadow-lg'
      }`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* Avatar */}
      <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl flex items-center justify-center flex-shrink-0 transition-all duration-300 ${
        isUser 
          ? 'bg-gradient-to-br from-primary via-primary-hover to-secondary shadow-button group-hover:shadow-glow group-hover:scale-110' 
          : 'bg-gradient-to-br from-card to-muted backdrop-blur-xl border-2 border-secondary/30 shadow-card group-hover:border-secondary/50 group-hover:shadow-elegant'
      }`}>
        {isUser ? (
          <User className="w-5 h-5 sm:w-6 sm:h-6 text-primary-foreground" />
        ) : (
          <ASIcon className="w-6 h-6 sm:w-8 sm:h-8" />
        )}
      </div>

      <div className="flex-1 min-w-0 space-y-2 sm:space-y-3 overflow-hidden">
        {imageUrl && (
          <img 
            src={imageUrl} 
            alt="Uploaded" 
            className="max-w-full sm:max-w-xs rounded-xl sm:rounded-2xl shadow-lg border border-border/30 hover:shadow-xl transition-shadow duration-300" 
          />
        )}

        {isEditing ? (
          <div className="space-y-3">
            <Textarea
              value={editedContent}
              onChange={(e) => setEditedContent(e.target.value)}
              className="min-h-[100px] bg-background/80 backdrop-blur-sm border-primary/30 focus:border-primary rounded-xl text-sm"
            />
            <div className="flex gap-2 flex-wrap">
              <Button size="sm" onClick={handleSave} className="gap-2 gradient-primary shadow-button hover:shadow-glow rounded-xl text-xs sm:text-sm">
                <RefreshCw className="w-3 h-3 sm:w-4 sm:h-4" />
                ذخیره و پاسخ جدید
              </Button>
              <Button size="sm" variant="outline" onClick={() => setIsEditing(false)} className="rounded-xl text-xs sm:text-sm">
                لغو
              </Button>
            </div>
          </div>
        ) : (
          <div className="prose prose-sm max-w-none text-foreground leading-relaxed text-sm sm:text-base overflow-hidden" style={{ wordWrap: 'break-word', overflowWrap: 'break-word', whiteSpace: 'pre-wrap' }}>
            {renderContent(content)}
          </div>
        )}

        {/* Action buttons */}
        <div className={`flex gap-1 sm:gap-2 pt-1 transition-all duration-300 flex-wrap ${showActions && !isEditing ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2 pointer-events-none'}`}>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleCopy}
            className="h-7 sm:h-8 px-2 sm:px-3 text-xs rounded-lg sm:rounded-xl bg-muted/50 hover:bg-primary/15 hover:text-primary transition-all duration-200"
          >
            {copied ? <Check className="w-3 h-3 sm:w-4 sm:h-4 text-accent" /> : <Copy className="w-3 h-3 sm:w-4 sm:h-4" />}
            <span className="mr-1 hidden sm:inline">{copied ? 'کپی شد' : 'کپی'}</span>
          </Button>
          {isUser && (
            <>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setIsEditing(true)}
                className="h-7 sm:h-8 px-2 sm:px-3 text-xs rounded-lg sm:rounded-xl bg-muted/50 hover:bg-secondary/15 hover:text-secondary transition-all duration-200"
              >
                <Pencil className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="mr-1 hidden sm:inline">ویرایش</span>
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleDelete}
                className="h-7 sm:h-8 px-2 sm:px-3 text-xs rounded-lg sm:rounded-xl bg-muted/50 text-destructive hover:bg-destructive/15 transition-all duration-200"
              >
                <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="mr-1 hidden sm:inline">حذف</span>
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatMessage;