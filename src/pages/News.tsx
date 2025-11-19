import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Newspaper } from 'lucide-react';
import { NewsDisplay } from '@/components/NewsDisplay';

const News = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => navigate('/chat')}
            className="gap-2 transition-spring hover:scale-105"
          >
            <ArrowLeft className="w-4 h-4" />
            بازگشت به چت
          </Button>
        </div>

        {/* News Display */}
        <Card className="shadow-elegant border-2 border-border/60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <Newspaper className="w-6 h-6 text-primary animate-float" />
              اخبار و اطلاعیه‌ها
            </CardTitle>
            <CardDescription>
              آخرین اخبار و اطلاعیه‌های مهم دانشگاه پیام نور
            </CardDescription>
          </CardHeader>
          <CardContent>
            <NewsDisplay />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default News;