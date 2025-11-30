import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, FileText } from 'lucide-react';
import { RequestManager } from '@/components/RequestManager';

const Requests = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background p-2 sm:p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => navigate('/admin')}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            بازگشت
          </Button>
        </div>

        <Card className="border-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <FileText className="w-5 h-5 text-primary" />
              مدیریت درخواست‌ها
            </CardTitle>
            <CardDescription>
              بررسی و پاسخ به درخواست‌های کاربران
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RequestManager />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Requests;
