import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Home, ArrowRight, AlertCircle } from "lucide-react";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-accent/5" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,hsl(var(--primary)/0.15),transparent_60%)]" />
      
      <Card className="relative max-w-md w-full shadow-2xl border-2 border-primary/20 animate-in fade-in zoom-in duration-500 backdrop-blur-sm bg-card/95">
        <CardContent className="p-8 text-center space-y-6">
          <div className="relative">
            <div className="absolute inset-0 animate-pulse-glow rounded-full blur-3xl bg-primary/30" />
            <AlertCircle className="w-24 h-24 mx-auto text-primary animate-float relative drop-shadow-2xl" />
          </div>
          
          <div className="space-y-3">
            <h1 className="text-7xl font-bold gradient-text drop-shadow-lg">404</h1>
            <h2 className="text-2xl font-bold text-foreground">صفحه پیدا نشد</h2>
            <p className="text-muted-foreground leading-relaxed">
              متأسفانه صفحه‌ای که به دنبال آن هستید وجود ندارد یا حذف شده است
            </p>
          </div>

          <div className="pt-4 space-y-3">
            <Button 
              onClick={() => navigate('/')} 
              className="w-full gap-2 shadow-lg hover:shadow-xl transition-all hover:scale-105"
            >
              <Home className="w-4 h-4" />
              بازگشت به صفحه اصلی
            </Button>
            
            <Button 
              onClick={() => navigate(-1)} 
              variant="outline"
              className="w-full gap-2 hover:bg-muted transition-all"
            >
              <ArrowRight className="w-4 h-4" />
              بازگشت به صفحه قبل
            </Button>
          </div>

          <div className="pt-4 border-t border-border/50">
            <p className="text-xs text-muted-foreground">
              مسیر درخواستی: <code className="text-primary">{location.pathname}</code>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default NotFound;
