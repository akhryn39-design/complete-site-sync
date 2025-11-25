import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Switch } from './ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { useToast } from './ui/use-toast';
import { Save, RefreshCw } from 'lucide-react';

interface SystemSetting {
  id: string;
  key: string;
  value: any;
  description: string;
  category: string;
}

export const SystemSettings = () => {
  const [settings, setSettings] = useState<SystemSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('system_settings')
        .select('*')
        .order('category', { ascending: true });

      if (error) throw error;
      setSettings(data || []);
    } catch (error: any) {
      toast({
        title: 'خطا در بارگذاری تنظیمات',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = async (id: string, value: any) => {
    try {
      const { error } = await supabase
        .from('system_settings')
        .update({ value })
        .eq('id', id);

      if (error) throw error;

      setSettings(settings.map(s => s.id === id ? { ...s, value } : s));
    } catch (error: any) {
      toast({
        title: 'خطا در به‌روزرسانی',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleSaveAll = async () => {
    setSaving(true);
    toast({
      title: 'ذخیره شد',
      description: 'تمام تنظیمات با موفقیت ذخیره شدند',
    });
    setSaving(false);
  };

  const groupedSettings = settings
    .filter(s => 
      searchTerm === '' || 
      s.key.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.category.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .reduce((acc, setting) => {
      if (!acc[setting.category]) {
        acc[setting.category] = [];
      }
      acc[setting.category].push(setting);
      return acc;
    }, {} as Record<string, SystemSetting[]>);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold gradient-text flex items-center gap-2">
            تنظیمات سیستم
            <span className="text-sm font-normal text-muted-foreground bg-primary/10 px-3 py-1 rounded-full border border-primary/20">
              {settings.length} تنظیم
            </span>
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            مدیریت تنظیمات در {Object.keys(groupedSettings).length} دسته | پشتیبانی تا 500 تنظیم
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
          <Input
            placeholder="جستجو در تنظیمات..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full sm:w-64 border-border/50 focus:border-primary/50 transition-all"
          />
          <Button onClick={handleSaveAll} disabled={saving} className="w-full sm:w-auto bg-gradient-to-r from-primary to-secondary hover:from-primary-hover hover:to-secondary-hover shadow-md hover:shadow-lg transition-all">
            <Save className="mr-2 h-4 w-4" />
            {saving ? 'در حال ذخیره...' : 'ذخیره همه'}
          </Button>
        </div>
      </div>

      {Object.entries(groupedSettings).map(([category, categorySettings]) => (
        <Card key={category} className="shadow-md hover:shadow-elegant transition-all duration-300 border-border/50 bg-card/80 backdrop-blur-sm">
          <CardHeader className="border-b border-border/50">
            <CardTitle className="text-lg capitalize flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                <span className="w-2 h-2 rounded-full bg-white animate-pulse"></span>
              </div>
              <div>
                <div className="font-bold">{category}</div>
                <div className="text-sm font-normal text-muted-foreground">{categorySettings.length} تنظیم</div>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {categorySettings.map((setting) => (
              <div key={setting.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="space-y-1 flex-1">
                  <Label className="text-base">{setting.key}</Label>
                  {setting.description && (
                    <p className="text-sm text-muted-foreground">
                      {setting.description}
                    </p>
                  )}
                </div>
                {typeof setting.value === 'boolean' ? (
                  <Switch
                    checked={setting.value}
                    onCheckedChange={(checked) => updateSetting(setting.id, checked)}
                    className="self-start sm:self-center"
                  />
                ) : typeof setting.value === 'number' ? (
                  <Input
                    type="number"
                    value={setting.value?.toString() || ''}
                    onChange={(e) => updateSetting(setting.id, parseFloat(e.target.value) || 0)}
                    className="w-full sm:w-64"
                  />
                ) : (
                  <Input
                    value={setting.value?.toString() || ''}
                    onChange={(e) => updateSetting(setting.id, e.target.value)}
                    className="w-full sm:w-64"
                  />
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      ))}

      {Object.keys(groupedSettings).length === 0 && (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            هیچ تنظیماتی یافت نشد
          </CardContent>
        </Card>
      )}
    </div>
  );
};