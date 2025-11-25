import { useState, useRef } from 'react';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Send, Image as ImageIcon, Loader2, X, Mic, Square, Paperclip, Sparkles } from 'lucide-react';
import { useToast } from './ui/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface ChatInputProps {
  onSendMessage: (content: string, imageUrl?: string, fileUrl?: string) => void;
  loading: boolean;
}

const ChatInput = ({ onSendMessage, loading }: ChatInputProps) => {
  const [message, setMessage] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const { toast } = useToast();

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.type.startsWith('image/')) {
      toast({
        title: 'خطا',
        description: 'لطفاً یک فایل تصویری انتخاب کنید',
        variant: 'destructive'
      });
      return;
    }

    if (selectedFile.size > 10 * 1024 * 1024) {
      toast({
        title: 'خطا',
        description: 'حجم فایل نباید بیشتر از 10 مگابایت باشد',
        variant: 'destructive'
      });
      return;
    }

    setImageFile(selectedFile);
    setImagePreview(URL.createObjectURL(selectedFile));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (selectedFile.size > 50 * 1024 * 1024) {
      toast({
        title: 'خطا',
        description: 'حجم فایل نباید بیشتر از 50 مگابایت باشد',
        variant: 'destructive'
      });
      return;
    }

    setFile(selectedFile);
    toast({
      title: 'فایل انتخاب شد',
      description: selectedFile.name
    });
  };

  const clearImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (imageInputRef.current) {
      imageInputRef.current.value = '';
    }
  };

  const clearFile = () => {
    setFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async () => {
    if (!message.trim() && !imageFile && !file) return;

    let imageUrl: string | undefined;
    let fileUrl: string | undefined;

    if (imageFile) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('کاربر وارد نشده است');

        const fileExt = imageFile.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('chat-images')
          .upload(fileName, imageFile, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) throw uploadError;

        const { data } = supabase.storage
          .from('chat-images')
          .getPublicUrl(fileName);

        imageUrl = data.publicUrl;
      } catch (error: any) {
        toast({
          title: 'خطا در بارگذاری تصویر',
          description: error.message,
          variant: 'destructive'
        });
        return;
      }
    }

    if (file) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('کاربر وارد نشده است');

        const fileExt = file.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('chat-images')
          .upload(fileName, file, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) throw uploadError;

        const { data } = supabase.storage
          .from('chat-images')
          .getPublicUrl(fileName);

        fileUrl = data.publicUrl;
      } catch (error: any) {
        toast({
          title: 'خطا در بارگذاری فایل',
          description: error.message,
          variant: 'destructive'
        });
        return;
      }
    }

    onSendMessage(message, imageUrl, fileUrl);
    setMessage('');
    clearImage();
    clearFile();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm;codecs=opus' });
        await handleAudioUpload(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start(100);
      setIsRecording(true);

      toast({
        title: '🎙️ ضبط شروع شد',
        description: 'در حال ضبط صدای شما...',
        duration: 2000
      });
    } catch (error: any) {
      console.error('Recording error:', error);
      toast({
        title: 'خطا در ضبط صدا',
        description: 'لطفاً دسترسی به میکروفون را بررسی کنید',
        variant: 'destructive'
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      toast({
        title: '⏹️ ضبط متوقف شد',
        description: 'در حال تبدیل به متن...'
      });
    }
  };

  const handleAudioUpload = async (audioBlob: Blob) => {
    const loadingToast = toast({
      title: '⏳ در حال پردازش...',
      description: 'صدای شما در حال تبدیل به متن است',
      duration: 10000
    });

    try {
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);

      reader.onloadend = async () => {
        const base64Audio = reader.result?.toString().split(',')[1];
        if (!base64Audio) {
          throw new Error('خطا در خواندن فایل صوتی');
        }

        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/transcribe-audio`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`
            },
            body: JSON.stringify({ audio: base64Audio })
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'خطا در تبدیل صدا به متن');
        }

        const data = await response.json();

        if (data?.text) {
          setMessage(prev => prev + (prev ? ' ' : '') + data.text);
          toast({
            title: '✅ صدا تبدیل شد',
            description: 'متن به فیلد پیام اضافه شد',
            duration: 3000
          });
        } else {
          throw new Error('متنی از صدا استخراج نشد');
        }
      };

      reader.onerror = () => {
        throw new Error('خطا در خواندن فایل صوتی');
      };

    } catch (error: any) {
      console.error('Audio transcription error:', error);
      toast({
        title: 'خطا در تبدیل صدا',
        description: error.message || 'لطفاً دوباره تلاش کنید',
        variant: 'destructive',
        duration: 5000
      });
    }
  };

  return (
    <div className="border-t border-border/50 bg-card/80 backdrop-blur-xl p-2 sm:p-3 md:p-4">
      {imagePreview && (
        <div className="mb-2 sm:mb-3 relative inline-block group">
          <img src={imagePreview} alt="Preview" className="max-h-24 sm:max-h-32 rounded-xl border-2 border-primary/20 shadow-md" />
          <Button
            size="sm"
            variant="destructive"
            className="absolute -top-1 -right-1 sm:-top-2 sm:-right-2 h-6 w-6 sm:h-7 sm:w-7 rounded-full p-0 opacity-0 group-hover:opacity-100 transition-all shadow-lg"
            onClick={clearImage}
          >
            <X className="h-3 w-3 sm:h-4 sm:w-4" />
          </Button>
        </div>
      )}

      {file && (
        <div className="mb-2 sm:mb-3 flex items-center gap-2 p-3 bg-accent/10 rounded-xl border border-accent/20 group hover:bg-accent/15 transition-all">
          <div className="p-2 bg-accent/20 rounded-lg">
            <Paperclip className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0 text-accent" />
          </div>
          <span className="text-xs sm:text-sm flex-1 truncate font-medium">{file.name}</span>
          <Button
            size="sm"
            variant="ghost"
            className="h-6 w-6 sm:h-7 sm:w-7 p-0 flex-shrink-0 opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive transition-all"
            onClick={clearFile}
          >
            <X className="h-3 w-3 sm:h-4 sm:w-4" />
          </Button>
        </div>
      )}

      <div className="flex gap-1 sm:gap-2 items-end">
        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageUpload}
          className="hidden"
        />
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileUpload}
          className="hidden"
        />

        <Button
          type="button"
          size="icon"
          variant="outline"
          onClick={() => imageInputRef.current?.click()}
          disabled={loading}
          className="h-9 w-9 sm:h-11 sm:w-11 flex-shrink-0 hover:bg-primary/10 hover:border-primary/50 hover:text-primary transition-all"
        >
          <ImageIcon className="h-4 w-4 sm:h-5 sm:w-5" />
        </Button>

        <Button
          type="button"
          size="icon"
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          disabled={loading}
          className="h-9 w-9 sm:h-11 sm:w-11 flex-shrink-0 hover:bg-secondary/10 hover:border-secondary/50 hover:text-secondary transition-all"
        >
          <Paperclip className="h-4 w-4 sm:h-5 sm:w-5" />
        </Button>

        <Button
          type="button"
          size="icon"
          variant="outline"
          onClick={isRecording ? stopRecording : startRecording}
          disabled={loading}
          className={`h-9 w-9 sm:h-11 sm:w-11 flex-shrink-0 transition-all ${isRecording ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90 animate-pulse' : 'hover:bg-accent/10 hover:border-accent/50 hover:text-accent'}`}
        >
          {isRecording ? <Square className="h-4 w-4 sm:h-5 sm:w-5" /> : <Mic className="h-4 w-4 sm:h-5 sm:w-5" />}
        </Button>

        <Textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="پیام خود را بنویسید..."
          className="min-h-[36px] sm:min-h-[44px] max-h-32 resize-none text-sm bg-background/50 border-border/50 focus:border-primary/50 focus:ring-primary/20 transition-all"
          disabled={loading}
        />

        <Button
          onClick={handleSubmit}
          disabled={loading || (!message.trim() && !imageFile && !file)}
          size="icon"
          className="h-9 w-9 sm:h-11 sm:w-11 flex-shrink-0 bg-gradient-to-r from-primary to-secondary hover:from-primary-hover hover:to-secondary-hover shadow-lg hover:shadow-glow transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 animate-spin" /> : <Sparkles className="h-4 w-4 sm:h-5 sm:w-5" />}
        </Button>
      </div>
    </div>
  );
};

export default ChatInput;