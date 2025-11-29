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

    if (selectedFile.size > 20 * 1024 * 1024) {
      toast({
        title: 'خطا',
        description: 'حجم تصویر نباید بیشتر از 20 مگابایت باشد',
        variant: 'destructive'
      });
      return;
    }

    // Validate image format
    const validFormats = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validFormats.includes(selectedFile.type)) {
      toast({
        title: 'خطا',
        description: 'فرمت تصویر باید JPG، PNG یا WEBP باشد',
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
    <div className="border-t border-border/30 bg-card/70 backdrop-blur-2xl p-3 sm:p-4 md:p-5 shadow-lg">
      {/* Image preview with enhanced styling */}
      {imagePreview && (
        <div className="mb-3 relative inline-block group animate-in fade-in zoom-in duration-300">
          <img 
            src={imagePreview} 
            alt="Preview" 
            className="max-h-28 sm:max-h-36 rounded-2xl border-2 border-primary/30 shadow-elegant hover:shadow-glow transition-all" 
          />
          <Button
            size="sm"
            variant="destructive"
            className="absolute -top-2 -right-2 h-7 w-7 sm:h-8 sm:w-8 rounded-full p-0 opacity-0 group-hover:opacity-100 transition-all shadow-xl hover:scale-110"
            onClick={clearImage}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* File preview with enhanced styling */}
      {file && (
        <div className="mb-3 flex items-center gap-3 p-4 bg-gradient-to-r from-accent/10 to-accent/5 rounded-2xl border border-accent/30 group hover:bg-accent/15 hover:scale-[1.02] transition-all shadow-md animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="p-2.5 bg-gradient-to-br from-accent to-accent-hover rounded-xl shadow-md">
            <Paperclip className="h-4 w-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-sm font-bold truncate block">{file.name}</span>
            <span className="text-xs text-muted-foreground">آماده برای ارسال</span>
          </div>
          <Button
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0 flex-shrink-0 opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive hover:scale-110 transition-all rounded-xl"
            onClick={clearFile}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Input area with enhanced design */}
      <div className="flex gap-2 items-end">
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

        {/* Image button */}
        <Button
          type="button"
          size="icon"
          variant="outline"
          onClick={() => imageInputRef.current?.click()}
          disabled={loading}
          className="h-10 w-10 sm:h-12 sm:w-12 flex-shrink-0 border-primary/30 bg-primary/5 hover:bg-primary/15 hover:border-primary/50 hover:text-primary hover:scale-110 transition-all rounded-xl shadow-sm"
        >
          <ImageIcon className="h-5 w-5" />
        </Button>

        {/* File button */}
        <Button
          type="button"
          size="icon"
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          disabled={loading}
          className="h-10 w-10 sm:h-12 sm:w-12 flex-shrink-0 border-secondary/30 bg-secondary/5 hover:bg-secondary/15 hover:border-secondary/50 hover:text-secondary hover:scale-110 transition-all rounded-xl shadow-sm"
        >
          <Paperclip className="h-5 w-5" />
        </Button>

        {/* Mic button */}
        <Button
          type="button"
          size="icon"
          variant="outline"
          onClick={isRecording ? stopRecording : startRecording}
          disabled={loading}
          className={`h-10 w-10 sm:h-12 sm:w-12 flex-shrink-0 transition-all rounded-xl shadow-sm ${
            isRecording 
              ? 'bg-gradient-to-br from-destructive to-destructive/80 text-white border-destructive hover:scale-110 animate-pulse shadow-elegant' 
              : 'border-accent/30 bg-accent/5 hover:bg-accent/15 hover:border-accent/50 hover:text-accent hover:scale-110'
          }`}
        >
          {isRecording ? (
            <Square className="h-5 w-5" />
          ) : (
            <Mic className="h-5 w-5" />
          )}
        </Button>

        {/* Text input */}
        <Textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="پیام خود را بنویسید... 💬"
          className="min-h-[40px] sm:min-h-[48px] max-h-36 resize-none text-sm sm:text-base bg-background/60 border-border/40 focus:border-primary/60 focus:ring-primary/30 rounded-2xl transition-all shadow-sm placeholder:text-muted-foreground/60"
          disabled={loading}
        />

        {/* Send button with sparkle effect */}
        <Button
          onClick={handleSubmit}
          disabled={loading || (!message.trim() && !imageFile && !file)}
          size="icon"
          className="h-10 w-10 sm:h-12 sm:w-12 flex-shrink-0 bg-gradient-to-br from-primary via-secondary to-accent hover:shadow-glow hover:scale-110 transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed disabled:scale-100 group rounded-xl shadow-button relative overflow-hidden"
        >
          {/* Shimmer effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
          
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Send className="h-5 w-5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform duration-300" />
          )}
        </Button>
      </div>
    </div>
  );
};

export default ChatInput;