import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Newspaper } from 'lucide-react';
import { NewsDisplay } from '@/components/NewsDisplay';

const News = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 p-2 sm:p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => navigate('/chat')}
            className="gap-1 sm:gap-2 transition-spring hover:scale-105 text-xs sm:text-sm h-8 sm:h-10 px-2 sm:px-4"
          >
            <ArrowLeft className="w-3 h-3 sm:w-4 sm:h-4" />
            بازگشت
          </Button>
        </div>

        {/* News Display */}
        <Card className="shadow-elegant border-2 border-border/60">
          <CardHeader className="p-3 sm:p-4 md:p-6">
            <CardTitle className="flex items-center gap-2 text-lg sm:text-xl md:text-2xl">
              <Newspaper className="w-5 h-5 sm:w-6 sm:h-6 text-primary animate-float" />
              اخبار و اطلاعیه‌ها
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              آخرین اخبار و اطلاعیه‌های مهم دانشگاه پیام نور
            </CardDescription>
          </CardHeader>
          <CardContent className="p-2 sm:p-4 md:p-6">
            <NewsDisplay />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default News;