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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold gradient-text">تنظیمات سیستم</h2>
          <p className="text-sm text-muted-foreground">
            مدیریت {settings.length} تنظیم در {Object.keys(groupedSettings).length} دسته | پشتیبانی از تا 150 تنظیم مختلف
          </p>
        </div>
        <div className="flex gap-2">
          <Input
            placeholder="جستجو در تنظیمات..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-64"
          />
          <Button onClick={handleSaveAll} disabled={saving}>
            <Save className="mr-2 h-4 w-4" />
            {saving ? 'در حال ذخیره...' : 'ذخیره همه'}
          </Button>
        </div>
      </div>

      {Object.entries(groupedSettings).map(([category, categorySettings]) => (
        <Card key={category} className="shadow-elegant hover:shadow-glow transition-all duration-300">
          <CardHeader>
            <CardTitle className="text-lg capitalize flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
              {category}
            </CardTitle>
            <CardDescription>{categorySettings.length} تنظیمات</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {categorySettings.map((setting) => (
              <div key={setting.id} className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>{setting.key}</Label>
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
                  />
                ) : typeof setting.value === 'number' ? (
                  <Input
                    type="number"
                    value={setting.value?.toString() || ''}
                    onChange={(e) => updateSetting(setting.id, parseFloat(e.target.value) || 0)}
                    className="w-64"
                  />
                ) : (
                  <Input
                    value={setting.value?.toString() || ''}
                    onChange={(e) => updateSetting(setting.id, e.target.value)}
                    className="w-64"
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