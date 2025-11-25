import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Upload, FileText, Trash2, Download, ArrowLeft, Eye } from 'lucide-react';
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
        'application/vnd.ms-excel',
        'application/vnd.ms-powerpoint',
        'image/jpeg',
        'image/png',
        'image/webp',
        'image/gif',
        'video/mp4',
        'video/webm',
        'text/plain'
      ];
      
      if (!allowedTypes.includes(selectedFile.type)) {
        toast({
          title: 'فرمت نامعتبر',
          description: 'فایل‌های مجاز: PDF, Word, Excel, PowerPoint, تصاویر, ویدیو، متن',
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

  const handleView = async (material: Material) => {
    try {
      const { data } = supabase.storage
        .from('educational-files')
        .getPublicUrl(material.file_path);

      window.open(data.publicUrl, '_blank');
      toast({
        title: 'باز شد',
        description: 'فایل در تب جدید باز شد',
      });
    } catch (error: any) {
      toast({
        title: 'خطا',
        description: 'خطا در باز کردن فایل',
        variant: 'destructive',
      });
    }
  };

  const handleDownload = async (material: Material) => {
    try {
      const { data } = supabase.storage
        .from('educational-files')
        .getPublicUrl(material.file_path);

      const link = document.createElement('a');
      link.href = data.publicUrl;
      link.download = material.title;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: 'دانلود شروع شد',
        description: 'فایل در حال دانلود است',
      });
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
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 p-2 sm:p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => navigate('/chat')}
            className="gap-1 sm:gap-2 text-xs sm:text-sm h-8 sm:h-10 px-2 sm:px-4"
          >
            <ArrowLeft className="w-3 h-3 sm:w-4 sm:h-4" />
            بازگشت
          </Button>
        </div>

        <Card className="shadow-elegant border-2">
          <CardHeader className="p-3 sm:p-4 md:p-6">
            <CardTitle className="text-lg sm:text-xl md:text-2xl">مواد آموزشی</CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              دانلود منابع و فایل‌های آموزشی
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 sm:space-y-6 p-2 sm:p-4 md:p-6">
            {isAdmin && (
              <Card>
                <CardHeader className="p-3 sm:p-4 md:p-6">
                  <CardTitle className="text-base sm:text-lg md:text-xl">آپلود فایل جدید</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 sm:space-y-4 p-3 sm:p-4 md:p-6">
                  <div>
                    <Input
                      placeholder="عنوان"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="text-sm"
                    />
                  </div>
                  <div>
                    <Textarea
                      placeholder="توضیحات"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="text-sm"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <Select value={category} onValueChange={setCategory}>
                      <SelectTrigger className="text-sm">
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
                      className="text-sm"
                    />
                  </div>
                  <div>
                    <Input
                      type="file"
                      accept=".pdf,.docx,.pptx,.xlsx,image/jpeg,image/png,image/webp"
                      onChange={handleFileChange}
                      className="text-sm"
                    />
                    <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">
                      فرمت‌های مجاز: PDF, DOCX, PPTX, XLSX, JPG, PNG, WEBP (حداکثر ۲۰۰ مگابایت)
                    </p>
                  </div>
                  <Button
                    onClick={handleUpload}
                    disabled={uploading}
                    className="w-full text-sm"
                  >
                    {uploading ? 'در حال آپلود...' : 'آپلود فایل'}
                    <Upload className="mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                  </Button>
                </CardContent>
              </Card>
            )}

            <div className="flex gap-2 sm:gap-4">
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-32 sm:w-48 text-sm">
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

            <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
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
                          onClick={() => handleView(material)}
                          variant="outline"
                          className="flex-1"
                          size="sm"
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          مشاهده
                        </Button>
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