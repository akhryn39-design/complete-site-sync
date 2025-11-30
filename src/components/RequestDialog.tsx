import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { FileText, Send } from 'lucide-react';

export const RequestDialog = () => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'book'
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      toast.error('لطفاً عنوان درخواست را وارد کنید');
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('کاربر وارد نشده است');

      const { error } = await supabase
        .from('requests')
        .insert({
          user_id: user.id,
          title: formData.title,
          description: formData.description,
          category: formData.category,
          status: 'pending'
        });

      if (error) throw error;

      toast.success('درخواست شما با موفقیت ثبت شد');
      setFormData({ title: '', description: '', category: 'book' });
      setOpen(false);
    } catch (error) {
      console.error('Error creating request:', error);
      toast.error('خطا در ثبت درخواست');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <FileText className="w-4 h-4" />
          ثبت درخواست
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>درخواست جدید</DialogTitle>
          <DialogDescription>
            درخواست کتاب، منبع آموزشی یا سایر نیازهای خود را ثبت کنید
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">عنوان درخواست *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="مثال: کتاب ریاضی پیشرفته"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">دسته‌بندی</Label>
            <Select
              value={formData.category}
              onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
            >
              <SelectTrigger id="category">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="book">کتاب</SelectItem>
                <SelectItem value="summary">خلاصه</SelectItem>
                <SelectItem value="sample">نمونه سوال</SelectItem>
                <SelectItem value="video">ویدیو آموزشی</SelectItem>
                <SelectItem value="other">سایر</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">توضیحات تکمیلی</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="جزئیات بیشتر درباره درخواست خود..."
              className="min-h-24"
            />
          </div>

          <div className="flex gap-2">
            <Button type="submit" disabled={loading} className="flex-1 gap-2">
              <Send className="w-4 h-4" />
              {loading ? 'در حال ارسال...' : 'ارسال درخواست'}
            </Button>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              انصراف
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
