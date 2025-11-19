import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const Index = () => {
  const navigate = useNavigate();

  useEffect(() => {
    document.title = 'چت هوشمند پیام‌نور | دستیار آموزشی AS';
  }, []);

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-background to-muted/30">
      <div className="absolute inset-0 opacity-40 pointer-events-none" aria-hidden>
        <div className="absolute -top-10 -right-10 w-80 h-80 gradient-primary rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 -left-10 w-[28rem] h-[28rem] bg-accent/20 rounded-full blur-3xl animate-float" />
      </div>

      <header className="container mx-auto px-6 pt-16 pb-6 flex items-center justify-between">
        <h1 className="text-3xl md:text-4xl font-extrabold gradient-text">چت هوشمند پیام‌نور</h1>
        <Button 
          onClick={() => navigate('/chat')}
          className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-primary text-primary-foreground shadow-elegant hover:opacity-90 transition-smooth"
        >
          شروع گفتگو
        </Button>
      </header>

      <main className="container mx-auto px-6 pb-20 pt-6 grid md:grid-cols-2 gap-10 items-center">
        <section>
          <h2 className="text-4xl md:text-5xl font-black leading-tight bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
            دستیار آموزشی AS برای فایل‌ها، سوال‌ها و صداهای شما
          </h2>
          <p className="mt-4 text-muted-foreground text-lg leading-relaxed">
            فایل‌های آموزشی را با لینک مستقیم دریافت کنید، سوال‌های درسی را بپرسید و حتی با صدا پیام بدهید. همه‌چیز سریع، دقیق و فارسی.
          </p>
          <div className="mt-8 flex flex-wrap gap-3 text-sm">
            <span className="px-3 py-2 rounded-lg bg-card border">لینک دانلود مستقیم کتاب‌ها</span>
            <span className="px-3 py-2 rounded-lg bg-card border">تبدیل گفتار به نوشتار فارسی</span>
            <span className="px-3 py-2 rounded-lg bg-card border">تنظیمات پیشرفته سیستم</span>
          </div>
        </section>
        <aside>
          <div className="rounded-2xl border bg-card/80 backdrop-blur p-6 shadow-xl">
            <div className="h-64 gradient-primary rounded-xl shadow-glow" />
            <p className="mt-4 text-sm text-muted-foreground">
              طراحی مدرن با گرادیان‌ها و سایه‌های نرم — کاملاً واکنش‌گرا.
            </p>
          </div>
        </aside>
      </main>
    </div>
  );
};

export default Index;