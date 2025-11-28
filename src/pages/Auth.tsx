import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Brain, Sparkles, MessageSquare } from 'lucide-react';

const Auth = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      toast({
        title: 'خطا در ورود',
        description: error.message === 'Invalid login credentials'
          ? 'ایمیل یا رمز عبور اشتباه است'
          : error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'خوش آمدید!',
        description: 'با موفقیت وارد شدید',
      });
      navigate('/chat');
    }

    setLoading(false);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
        emailRedirectTo: `${window.location.origin}/chat`,
      },
    });

    if (error) {
      toast({
        title: 'خطا در ثبت‌نام',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'ثبت‌نام موفق!',
        description: 'اکنون می‌توانید وارد شوید',
      });
      navigate('/chat');
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background effects */}
      <div className="absolute inset-0 bg-[var(--gradient-bg)]" />
      <div className="absolute inset-0 bg-[var(--gradient-mesh)]" />
      
      {/* Floating orbs */}
      <div className="absolute top-10 left-10 w-80 h-80 bg-gradient-to-br from-primary/30 to-primary-glow/20 rounded-full blur-3xl animate-float" />
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-gradient-to-br from-secondary/30 to-secondary-hover/20 rounded-full blur-3xl animate-float" style={{ animationDelay: '1.5s' }} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-br from-accent/15 to-transparent rounded-full blur-3xl animate-pulse-slow" />
      
      {/* Sparkle particles */}
      <div className="absolute top-20 right-1/4 w-2 h-2 bg-primary rounded-full animate-pulse shadow-glow" />
      <div className="absolute bottom-32 left-1/3 w-3 h-3 bg-secondary rounded-full animate-bounce" style={{ animationDelay: '0.5s' }} />
      <div className="absolute top-1/3 right-20 w-2 h-2 bg-accent rounded-full animate-pulse" style={{ animationDelay: '1s' }} />

      <div className="w-full max-w-md relative z-10">
        {/* Header */}
        <div className="text-center mb-10 space-y-5">
          <div className="flex justify-center items-center gap-3 mb-6">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 backdrop-blur-sm border border-primary/20 shadow-elegant animate-float">
              <MessageSquare className="w-10 h-10 text-primary" />
            </div>
            <div className="p-2 rounded-xl bg-gradient-to-br from-accent/20 to-accent/5 backdrop-blur-sm border border-accent/20 shadow-md animate-bounce-subtle">
              <Sparkles className="w-7 h-7 text-accent" />
            </div>
            <div className="p-3 rounded-2xl bg-gradient-to-br from-secondary/20 to-secondary/5 backdrop-blur-sm border border-secondary/20 shadow-elegant animate-float" style={{ animationDelay: '0.5s' }}>
              <Brain className="w-10 h-10 text-secondary" />
            </div>
          </div>
          <h1 className="text-4xl md:text-5xl font-decorative gradient-text drop-shadow-lg">
            چت هوشمند دانشگاه
          </h1>
          <p className="text-muted-foreground text-lg font-medium">
            سیستم پرسش و پاسخ هوشمند دانشگاهی
          </p>
        </div>

        {/* Card */}
        <Card className="shadow-2xl border border-border/50 bg-card/90 backdrop-blur-xl overflow-hidden">
          <div className="absolute inset-0 bg-[var(--gradient-shine)] animate-shimmer pointer-events-none" />
          
          <Tabs defaultValue="signin" className="w-full relative">
            <CardHeader className="pb-4">
              <TabsList className="grid w-full grid-cols-2 p-1.5 bg-muted/50 backdrop-blur-sm">
                <TabsTrigger value="signin" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-secondary data-[state=active]:text-white data-[state=active]:shadow-button font-bold transition-all duration-300">
                  ورود
                </TabsTrigger>
                <TabsTrigger value="signup" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-secondary data-[state=active]:to-accent data-[state=active]:text-white data-[state=active]:shadow-button font-bold transition-all duration-300">
                  ثبت‌نام
                </TabsTrigger>
              </TabsList>
            </CardHeader>

            <TabsContent value="signin" className="mt-0">
              <form onSubmit={handleSignIn}>
                <CardContent className="space-y-5 pt-2">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-bold text-foreground/80">ایمیل</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="email@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      dir="ltr"
                      className="h-12 bg-input/50 border-border/50 focus:border-primary focus:ring-primary/20 transition-all duration-300 rounded-xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-sm font-bold text-foreground/80">رمز عبور</Label>
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      dir="ltr"
                      className="h-12 bg-input/50 border-border/50 focus:border-primary focus:ring-primary/20 transition-all duration-300 rounded-xl"
                    />
                  </div>
                </CardContent>
                <CardFooter className="pt-2 pb-6">
                  <Button
                    type="submit"
                    className="w-full h-12 text-lg font-bold gradient-primary shadow-button hover:shadow-glow hover:scale-[1.02] transition-all duration-300 rounded-xl"
                    disabled={loading}
                  >
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        در حال ورود...
                      </span>
                    ) : 'ورود'}
                  </Button>
                </CardFooter>
              </form>
            </TabsContent>

            <TabsContent value="signup" className="mt-0">
              <form onSubmit={handleSignUp}>
                <CardContent className="space-y-4 pt-2">
                  <div className="space-y-2">
                    <Label htmlFor="fullname" className="text-sm font-bold text-foreground/80">نام کامل</Label>
                    <Input
                      id="fullname"
                      type="text"
                      placeholder="نام و نام خانوادگی"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                      className="h-12 bg-input/50 border-border/50 focus:border-secondary focus:ring-secondary/20 transition-all duration-300 rounded-xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email" className="text-sm font-bold text-foreground/80">ایمیل</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="email@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      dir="ltr"
                      className="h-12 bg-input/50 border-border/50 focus:border-secondary focus:ring-secondary/20 transition-all duration-300 rounded-xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password" className="text-sm font-bold text-foreground/80">رمز عبور</Label>
                    <Input
                      id="signup-password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      dir="ltr"
                      minLength={6}
                      className="h-12 bg-input/50 border-border/50 focus:border-secondary focus:ring-secondary/20 transition-all duration-300 rounded-xl"
                    />
                  </div>
                </CardContent>
                <CardFooter className="pt-2 pb-6">
                  <Button
                    type="submit"
                    className="w-full h-12 text-lg font-bold bg-gradient-to-r from-secondary via-secondary-hover to-accent shadow-button hover:shadow-glow hover:scale-[1.02] transition-all duration-300 rounded-xl text-white"
                    disabled={loading}
                  >
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        در حال ثبت‌نام...
                      </span>
                    ) : 'ثبت‌نام'}
                  </Button>
                </CardFooter>
              </form>
            </TabsContent>
          </Tabs>
        </Card>
        
        {/* Footer decoration */}
        <div className="mt-8 flex justify-center gap-2">
          <div className="w-2 h-2 rounded-full bg-primary/50 animate-pulse" />
          <div className="w-2 h-2 rounded-full bg-secondary/50 animate-pulse" style={{ animationDelay: '0.3s' }} />
          <div className="w-2 h-2 rounded-full bg-accent/50 animate-pulse" style={{ animationDelay: '0.6s' }} />
        </div>
      </div>
    </div>
  );
};

export default Auth;