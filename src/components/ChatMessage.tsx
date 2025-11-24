import { useState } from 'react';
import { Button } from './ui/button';
import { Copy, Pencil, Trash2, Check, User, BrainCircuit, FileDown } from 'lucide-react';
import { useToast } from './ui/use-toast';
import { Textarea } from './ui/textarea';
import { supabase } from '@/integrations/supabase/client';

interface ChatMessageProps {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  imageUrl?: string | null;
  onUpdate: () => void;
}

const ChatMessage = ({ id, role, content, imageUrl, onUpdate }: ChatMessageProps) => {
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
      description: 'پیام با موفقیت ویرایش شد',
    });
    setIsEditing(false);
    onUpdate();
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
      className={`flex gap-3 p-4 rounded-2xl transition-all ${
        isUser
          ? 'bg-primary/10 ml-8'
          : 'bg-secondary/10 mr-8'
      }`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
        isUser ? 'bg-primary shadow-md' : 'bg-gradient-to-br from-primary via-accent to-secondary shadow-glow animate-pulse-slow'
      }`}>
        {isUser ? <User className="w-5 h-5 text-primary-foreground" /> : <BrainCircuit className="w-5 h-5 text-primary-foreground animate-pulse" />}
      </div>

      <div className="flex-1 min-w-0">
        {imageUrl && (
          <img src={imageUrl} alt="Uploaded" className="max-w-xs rounded-lg mb-2" />
        )}

        {isEditing ? (
          <div className="space-y-2">
            <Textarea
              value={editedContent}
              onChange={(e) => setEditedContent(e.target.value)}
              className="min-h-[100px]"
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSave}>ذخیره</Button>
              <Button size="sm" variant="outline" onClick={() => setIsEditing(false)}>لغو</Button>
            </div>
          </div>
        ) : (
          <div className="prose prose-sm max-w-none text-foreground">
            {renderContent(content)}
          </div>
        )}

        {showActions && !isEditing && (
          <div className="flex gap-2 mt-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={handleCopy}
              className="h-8"
            >
              {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
            </Button>
            {isUser && (
              <>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setIsEditing(true)}
                  className="h-8"
                >
                  <Pencil className="w-3 h-3" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleDelete}
                  className="h-8 text-destructive hover:text-destructive"
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