import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Switch } from './ui/switch';
import { Label } from './ui/label';
import { useToast } from './ui/use-toast';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

interface Advertisement {
  id: string;
  title: string;
  content: string;
  image_url?: string;
  link_url?: string;
  position: string;
  is_active: boolean;
  lock_duration: number;
  display_order: number;
}

const AdManager = () => {
  const [ads, setAds] = useState<Advertisement[]>([]);
  const [editingAd, setEditingAd] = useState<Advertisement | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    title: '',
    content: '',
    image_url: '',
    link_url: '',
    position: 'sidebar',
    is_active: true,
    lock_duration: 0,
    display_order: 0,
  });

  useEffect(() => {
    loadAds();
  }, []);

  const loadAds = async () => {
    const { data, error } = await supabase
      .from('advertisements')
      .select('*')
      .order('display_order', { ascending: true });

    if (!error && data) {
      setAds(data);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingAd) {
        const { error } = await supabase
          .from('advertisements')
          .update(formData)
          .eq('id', editingAd.id);

        if (error) throw error;
        toast({ title: 'به‌روز شد', description: 'تبلیغ با موفقیت به‌روز شد' });
      } else {
        const { error } = await supabase
          .from('advertisements')
          .insert([formData]);

        if (error) throw error;
        toast({ title: 'ایجاد شد', description: 'تبلیغ جدید با موفقیت ایجاد شد' });
      }

      loadAds();
      setIsDialogOpen(false);
      resetForm();
    } catch (error: any) {
      toast({
        title: 'خطا',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('آیا مطمئن هستید؟')) return;

    const { error } = await supabase
      .from('advertisements')
      .delete()
      .eq('id', id);

    if (!error) {
      toast({ title: 'حذف شد', description: 'تبلیغ با موفقیت حذف شد' });
      loadAds();
    }
  };

  const handleEdit = (ad: Advertisement) => {
    setEditingAd(ad);
    setFormData({
      title: ad.title,
      content: ad.content,
      image_url: ad.image_url || '',
      link_url: ad.link_url || '',
      position: ad.position,
      is_active: ad.is_active,
      lock_duration: ad.lock_duration,
      display_order: ad.display_order,
    });
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setEditingAd(null);
    setFormData({
      title: '',
      content: '',
      image_url: '',
      link_url: '',
      position: 'sidebar',
      is_active: true,
      lock_duration: 0,
      display_order: 0,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">مدیریت تبلیغات</h2>
          <p className="text-sm text-muted-foreground">
            ایجاد و مدیریت تبلیغات سیستم
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="mr-2 h-4 w-4" />
              تبلیغ جدید
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingAd ? 'ویرایش تبلیغ' : 'تبلیغ جدید'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>عنوان</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label>محتوا</Label>
                <Textarea
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>URL تصویر</Label>
                  <Input
                    value={formData.image_url}
                    onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                    placeholder="https://..."
                  />
                  {formData.image_url && (
                    <div className="relative">
                      <img 
                        src={formData.image_url} 
                        alt="Preview" 
                        className="w-full h-20 object-cover rounded border"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                      <Button
                        type="button"
                        size="sm"
                        variant="destructive"
                        className="absolute top-1 left-1 h-5 w-5 p-0 text-xs"
                        onClick={() => setFormData({ ...formData, image_url: '' })}
                      >
                        ×
                      </Button>
                    </div>
                  )}
                </div>
                <div>
                  <Label>لینک</Label>
                  <Input
                    value={formData.link_url}
                    onChange={(e) => setFormData({ ...formData, link_url: e.target.value })}
                    placeholder="https://..."
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>موقعیت</Label>
                  <Select value={formData.position} onValueChange={(v) => setFormData({ ...formData, position: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sidebar">سایدبار</SelectItem>
                      <SelectItem value="chat_top">بالای چت</SelectItem>
                      <SelectItem value="chat_bottom">پایین چت</SelectItem>
                      <SelectItem value="modal">مودال</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>مدت قفل (ثانیه)</Label>
                  <Input
                    type="number"
                    value={formData.lock_duration}
                    onChange={(e) => setFormData({ ...formData, lock_duration: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <Label>ترتیب نمایش</Label>
                  <Input
                    type="number"
                    value={formData.display_order}
                    onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
                <Label>فعال</Label>
              </div>
              <Button type="submit" className="w-full">
                {editingAd ? 'به‌روزرسانی' : 'ایجاد'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {ads.map((ad) => (
          <Card key={ad.id}>
            <CardHeader>
              <CardTitle className="text-lg flex items-center justify-between">
                <span className="truncate">{ad.title}</span>
                <span className={`text-xs px-2 py-1 rounded ${ad.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                  {ad.is_active ? 'فعال' : 'غیرفعال'}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground line-clamp-2">{ad.content}</p>
              {ad.image_url && (
                <img src={ad.image_url} alt={ad.title} className="w-full h-32 object-cover rounded" />
              )}
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => handleEdit(ad)} className="flex-1">
                  <Edit className="h-3 w-3 mr-1" />
                  ویرایش
                </Button>
                <Button size="sm" variant="destructive" onClick={() => handleDelete(ad.id)}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default AdManager;