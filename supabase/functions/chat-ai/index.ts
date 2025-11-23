import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.83.0';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, userId } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Initialize Supabase client
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Get current date and time
    const now = new Date();
    const persianDate = new Intl.DateTimeFormat('fa-IR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Tehran'
    }).format(now);

    // Fetch user profile if userId provided
    let userContext = "";
    if (userId) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, avatar_url')
        .eq('id', userId)
        .single();
      
      const { data: userRole } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .single();

      if (profile) {
        userContext = `\n\nاطلاعات کاربر فعلی:
- نام: ${profile.full_name || 'نامشخص'}
- نقش: ${userRole?.role || 'user'}`;
      }
    }

    // Fetch available educational materials
    const { data: materials } = await supabase
      .from('educational_materials')
      .select('id, title, description, category, tags, file_path')
      .order('created_at', { ascending: false })
      .limit(50);

    let materialsContext = "";
    if (materials && materials.length > 0) {
      materialsContext = `\n\nمنابع آموزشی موجود در سیستم:\n${materials.map(m => 
        `- ${m.title} (دسته: ${m.category}) - ${m.description || 'بدون توضیحات'}`
      ).join('\n')}`;
    }

    const systemPrompt = `شما یک دستیار هوشمند پیشرفته دانشگاه پیام نور هستید با قابلیت‌های زیر:

**تاریخ و زمان فعلی:** ${persianDate}
${userContext}

**وظایف شما:**
1. پاسخ به سوالات آموزشی و دانشگاهی
2. راهنمایی در مورد رشته‌ها، دروس و برنامه‌های درسی
3. اطلاعات عمومی در مورد دانشگاه پیام نور
4. کمک در حل مسائل درسی و تکالیف
5. مشاوره تحصیلی
6. تحلیل تصاویر و اسناد آموزشی
7. دسترسی به منابع آموزشی موجود و معرفی آن‌ها
8. اطلاع از تاریخ و زمان دقیق برای برنامه‌ریزی

${materialsContext}

**دستورالعمل‌ها:**
- همیشه به زبان فارسی پاسخ دهید
- لحن شما باید دوستانه، محترمانه و حرفه‌ای باشد
- اگر تصویری ارسال شد، آن را به دقت تحلیل کنید
- در صورت نیاز به منابع آموزشی، از لیست بالا معرفی کنید
- اگر سوالی خارج از حوزه تخصص بود، به کاربر اطلاع دهید
- در پاسخ‌های خود از تاریخ و زمان فعلی استفاده کنید`;

    // Transform messages to support vision
    const transformedMessages = messages.map((msg: any) => {
      if (msg.image_url) {
        return {
          role: msg.role,
          content: [
            { type: 'text', text: msg.content },
            { type: 'image_url', image_url: { url: msg.image_url } }
          ]
        };
      }
      return msg;
    });

    // Use gemini-3-pro-preview for enhanced vision and reasoning
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-pro-preview",
        messages: [
          { role: "system", content: systemPrompt },
          ...transformedMessages
        ],
        stream: true,
        temperature: 0.8,
        max_tokens: 8000,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ 
            error: "محدودیت تعداد درخواست‌ها. لطفاً چند لحظه صبر کنید و دوباره تلاش کنید." 
          }),
          {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ 
            error: "اعتبار استفاده از هوش مصنوعی تمام شده است. لطفاً با پشتیبانی تماس بگیرید." 
          }),
          {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "خطا در دریافت پاسخ از هوش مصنوعی" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Return streaming response
    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("Chat AI error:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "خطای ناشناخته" 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
