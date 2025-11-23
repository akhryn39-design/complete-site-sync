import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Upload, FileText, Trash2, Download, ArrowLeft } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

interface Material {
  id: string;
  title: string;
  description: string | null;
  file_path: string;
  file_size: number;
  category: string;
  tags: string[];
  created_at: string;
}

const Materials = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isAdmin, setIsAdmin] = useState(false);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('other');
  const [tags, setTags] = useState('');
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    checkAdminRole();
    loadMaterials();
  }, []);

  const checkAdminRole = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsAdmin(false);
        return;
      }

      const { data, error } = await supabase.rpc('has_role', {
        _user_id: user.id,
        _role: 'admin'
      });

      if (error) throw error;
      setIsAdmin(data === true);
    } catch (error: any) {
      console.error('Error checking admin role:', error);
      setIsAdmin(false);
    }
  };

  const loadMaterials = async () => {
    try {
      const { data, error } = await supabase
        .from('educational_materials')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMaterials(data || []);
    } catch (error: any) {
      toast({
        title: 'خطا در بارگذاری',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      const allowedTypes = [
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'image/jpeg',
        'image/png',
        'image/webp'
      ];
      
      if (!allowedTypes.includes(selectedFile.type)) {
        toast({
          title: 'فرمت نامعتبر',
          description: 'فقط فایل‌های PDF, DOCX, PPTX, XLSX و تصاویر مجاز هستند',
          variant: 'destructive',
        });
        return;
      }
      if (selectedFile.size > 200 * 1024 * 1024) {
        toast({
          title: 'حجم زیاد',
          description: 'حجم فایل نباید بیشتر از ۲۰۰ مگابایت باشد',
          variant: 'destructive',
        });
        return;
      }
      setFile(selectedFile);
    }
  };

  const handleUpload = async () => {
    if (!file || !title.trim()) {
      toast({
        title: 'اطلاعات ناقص',
        description: 'لطفاً عنوان و فایل را وارد کنید',
        variant: 'destructive',
      });
      return;
    }

    setUploading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('کاربر وارد نشده است');

      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('educational-files')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase
        .from('educational_materials')
        .insert([{
          title,
          description,
          file_path: filePath,
          file_size: file.size,
          category,
          tags: tags.split(',').map(t => t.trim()).filter(Boolean),
          uploaded_by: user.id
        }]);

      if (dbError) throw dbError;

      toast({
        title: 'آپلود موفق',
        description: 'فایل با موفقیت آپلود شد',
      });

      setTitle('');
      setDescription('');
      setCategory('other');
      setTags('');
      setFile(null);
      loadMaterials();
    } catch (error: any) {
      toast({
        title: 'خطا در آپلود',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (material: Material) => {
    try {
      const { data } = supabase.storage
        .from('educational-files')
        .getPublicUrl(material.file_path);

      const ext = material.file_path.split('.').pop()?.toLowerCase();
      const isViewable = ['pdf', 'jpg', 'jpeg', 'png', 'webp'].includes(ext || '');
      
      if (isViewable) {
        window.open(data.publicUrl, '_blank');
      } else {
        const link = document.createElement('a');
        link.href = data.publicUrl;
        link.download = material.title;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (error: any) {
      toast({
        title: 'خطا در دانلود',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (id: string, filePath: string) => {
    if (!confirm('آیا مطمئن هستید؟')) return;

    try {
      await supabase.storage.from('educational-files').remove([filePath]);
      await supabase.from('educational_materials').delete().eq('id', id);

      toast({
        title: 'حذف شد',
        description: 'فایل با موفقیت حذف شد',
      });
      loadMaterials();
    } catch (error: any) {
      toast({
        title: 'خطا در حذف',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const filteredMaterials = selectedCategory === 'all'
    ? materials
    : materials.filter(m => m.category === selectedCategory);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => navigate('/chat')}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            بازگشت به چت
          </Button>
        </div>

        <Card className="shadow-elegant border-2">
          <CardHeader>
            <CardTitle className="text-2xl">مواد آموزشی</CardTitle>
            <CardDescription>
              دانلود منابع و فایل‌های آموزشی
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {isAdmin && (
              <Card>
                <CardHeader>
                  <CardTitle>آپلود فایل جدید</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Input
                      placeholder="عنوان"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                    />
                  </div>
                  <div>
                    <Textarea
                      placeholder="توضیحات"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <Select value={category} onValueChange={setCategory}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="book">کتاب</SelectItem>
                        <SelectItem value="article">مقاله</SelectItem>
                        <SelectItem value="exam">آزمون</SelectItem>
                        <SelectItem value="other">سایر</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input
                      placeholder="برچسب‌ها (با کاما جدا کنید)"
                      value={tags}
                      onChange={(e) => setTags(e.target.value)}
                    />
                  </div>
                  <div>
                    <Input
                      type="file"
                      accept=".pdf,.docx,.pptx,.xlsx,image/jpeg,image/png,image/webp"
                      onChange={handleFileChange}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      فرمت‌های مجاز: PDF, DOCX, PPTX, XLSX, JPG, PNG, WEBP (حداکثر ۲۰۰ مگابایت)
                    </p>
                  </div>
                  <Button
                    onClick={handleUpload}
                    disabled={uploading}
                    className="w-full"
                  >
                    {uploading ? 'در حال آپلود...' : 'آپلود فایل'}
                    <Upload className="mr-2 h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            )}

            <div className="flex gap-4">
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">همه</SelectItem>
                  <SelectItem value="book">کتاب</SelectItem>
                  <SelectItem value="article">مقاله</SelectItem>
                  <SelectItem value="exam">آزمون</SelectItem>
                  <SelectItem value="other">سایر</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {loading ? (
                <div className="col-span-full text-center py-8">
                  در حال بارگذاری...
                </div>
              ) : filteredMaterials.length === 0 ? (
                <div className="col-span-full text-center py-8 text-muted-foreground">
                  فایلی یافت نشد
                </div>
              ) : (
                filteredMaterials.map((material) => (
                  <Card key={material.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <CardTitle className="text-lg flex items-start gap-2">
                        <FileText className="h-5 w-5 flex-shrink-0 mt-1" />
                        <span className="line-clamp-2">{material.title}</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {material.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {material.description}
                        </p>
                      )}
                      <div className="flex flex-wrap gap-1">
                        {material.tags.map((tag, idx) => (
                          <Badge key={idx} variant="secondary">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={() => handleDownload(material)}
                          className="flex-1"
                          size="sm"
                        >
                          <Download className="h-4 w-4 mr-2" />
                          دانلود
                        </Button>
                        {isAdmin && (
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDelete(material.id, material.file_path)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Materials;