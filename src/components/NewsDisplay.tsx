import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Newspaper } from "lucide-react";

interface News {
  id: string;
  title: string;
  content: string;
  image_url?: string;
  video_url?: string;
  publish_date?: string;
  created_at: string;
}

export function NewsDisplay() {
  const [news, setNews] = useState<News[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadPublishedNews();
  }, []);

  const loadPublishedNews = async () => {
    try {
      const { data, error } = await supabase
        .from("news")
        .select("*")
        .eq("is_published", true)
        .order("created_at", { ascending: false })
        .limit(5);

      if (error) throw error;
      setNews(data || []);
    } catch (error) {
      console.error("Error loading news:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <Card className="mb-4">
        <CardContent className="p-4">
          <div className="animate-pulse space-y-2">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (news.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4 mb-4">
      <div className="flex items-center gap-2 text-lg font-semibold">
        <Newspaper className="h-5 w-5" />
        آخرین اخبار
      </div>
      {news.map((item) => (
        <Card key={item.id} className="overflow-hidden">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{item.title}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {item.image_url && (
              <img
                src={item.image_url}
                alt={item.title}
                className="w-full h-40 object-cover rounded-lg"
              />
            )}
            {item.video_url && (
              <video
                src={item.video_url}
                controls
                className="w-full rounded-lg max-h-60"
              />
            )}
            <p className="text-sm text-muted-foreground line-clamp-3">
              {item.content}
            </p>
            <p className="text-xs text-muted-foreground">
              {new Date(item.created_at).toLocaleDateString("fa-IR")}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}