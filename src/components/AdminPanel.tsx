import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Card } from './ui/card';
import { ScrollArea } from './ui/scroll-area';
import { Settings, Megaphone, Newspaper } from 'lucide-react';
import { SystemSettings } from './SystemSettings';
import AdManager from './AdManager';
import { NewsManager } from './NewsManager';

export const AdminPanel = () => {
  const [activeTab, setActiveTab] = useState('settings');

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-background via-background to-muted/20">
      <div className="relative p-6 border-b bg-gradient-to-r from-primary/5 via-primary/10 to-secondary/5 backdrop-blur-sm">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-gradient-to-br from-primary to-secondary shadow-lg">
            <Settings className="h-7 w-7 text-white" />
          </div>
          <div className="flex-1">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary via-primary to-secondary bg-clip-text text-transparent">
              پنل مدیریت جامع
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              مدیریت کامل سیستم و تنظیمات
            </p>
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-3 gap-2 h-auto p-2">
              <TabsTrigger value="settings" className="flex flex-col gap-2 py-3">
                <Settings className="h-5 w-5" />
                <span className="text-xs font-semibold">تنظیمات</span>
              </TabsTrigger>
              <TabsTrigger value="ads" className="flex flex-col gap-2 py-3">
                <Megaphone className="h-5 w-5" />
                <span className="text-xs font-semibold">تبلیغات</span>
              </TabsTrigger>
              <TabsTrigger value="news" className="flex flex-col gap-2 py-3">
                <Newspaper className="h-5 w-5" />
                <span className="text-xs font-semibold">اخبار</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="settings">
              <SystemSettings />
            </TabsContent>

            <TabsContent value="ads">
              <AdManager />
            </TabsContent>

            <TabsContent value="news">
              <NewsManager />
            </TabsContent>
          </Tabs>
        </div>
      </ScrollArea>
    </div>
  );
};