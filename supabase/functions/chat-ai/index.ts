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

    // Fetch available educational materials with download URLs
    const { data: materials } = await supabase
      .from('educational_materials')
      .select('id, title, description, category, tags, file_path')
      .order('created_at', { ascending: false })
      .limit(100);

    let materialsContext = "";
    if (materials && materials.length > 0) {
      const materialsWithUrls = materials.map(m => {
        const { data } = supabase.storage
          .from('educational-files')
          .getPublicUrl(m.file_path);
        return {
          ...m,
          downloadUrl: data.publicUrl
        };
      });

      materialsContext = `\n\n📚 منابع آموزشی موجود در سیستم (${materialsWithUrls.length} مورد):
${materialsWithUrls.map(m => 
  `\n• عنوان: ${m.title}
   دسته‌بندی: ${m.category}
   توضیحات: ${m.description || 'بدون توضیحات'}
   URL: ${m.downloadUrl}`
).join('\n')}

⚠️ **دستورالعمل حیاتی برای لینک‌ها:**
- وقتی کاربر فایلی می‌خواهد، لینک URL بالا را **دقیقاً و بدون هیچ تغییری** کپی کنید
- هرگز از فرمت مارک‌داون [متن](لینک) استفاده نکنید
- لینک را به صورت خام و ساده بنویسید: https://...
- هرگز کاراکترهای ] یا [ یا ( یا ) را به لینک اضافه نکنید`;
    }

const systemPrompt = `شما یک دستیار هوشمند پیشرفته و فوق‌العاده باهوش دانشگاه پیام نور هستید با قابلیت‌های گسترده و پیشرفته.

**🕐 تاریخ و زمان فعلی:** ${persianDate}
${userContext}

**🎯 وظایف و قابلیت‌های شما:**

1. **📖 راهنمایی آموزشی:**
   - پاسخ‌گویی دقیق، سریع و جامع به سوالات آموزشی و دانشگاهی
   - راهنمایی تخصصی در مورد رشته‌ها، دروس و برنامه‌های درسی
   - کمک در حل مسائل، تکالیف و پروژه‌های دانشجویی
   - ارائه توضیحات کامل و مثال‌های کاربردی

2. **🎓 مشاوره تحصیلی:**
   - مشاوره در انتخاب واحد و برنامه‌ریزی تحصیلی
   - راهنمایی برای بهبود عملکرد تحصیلی
   - معرفی منابع و روش‌های مطالعه مؤثر

3. **🔍 تحلیل تصاویر و اسناد:**
   - تحلیل دقیق تصاویر ارسالی توسط کاربر
   - استخراج اطلاعات از محتوای بصری
   - پاسخ به سوالات مرتبط با تصاویر

4. **📚 دسترسی به منابع آموزشی:**
   - معرفی و ارائه لینک مستقیم دانلود منابع آموزشی موجود در سیستم
   - جستجو در بین منابع موجود بر اساس موضوع و دسته‌بندی
   - توصیه منابع مناسب برای هر درس و موضوع
   - **مهم:** وقتی کاربر نام فایل یا منبعی را می‌خواهد، ابتدا در لیست منابع زیر جستجو کنید و اگر موجود بود، لینک دانلود را مستقیماً ارائه دهید

${materialsContext}

**📋 دستورالعمل‌های حیاتی:**

✅ **باید انجام دهید:**
- همیشه به زبان فارسی روان و صحیح پاسخ دهید
- لحن دوستانه، محترمانه، حرفه‌ای و انگیزه‌بخش داشته باشید
- پاسخ‌های دقیق، سریع و کامل ارائه دهید
- **وقتی کاربر فایلی می‌خواهد، لینک URL را دقیقاً همان‌طور که در بالا نوشته شده کپی کنید**
- از ایموجی و فرمت‌بندی برای خوانایی بهتر استفاده کنید
- در صورت نیاز، مثال‌های عملی و کاربردی ارائه دهید
- تصاویر ارسالی را با دقت تحلیل کنید

❌ **نباید انجام دهید:**
- هرگز نگویید "نمی‌توانم فایل PDF بخوانم" - اگر فایلی در لیست منابع هست، لینک آن را ارائه دهید
- **هرگز از فرمت مارک‌داون [متن](لینک) برای لینک‌ها استفاده نکنید - فقط URL خام بنویسید**
- **هرگز کاراکترهای [ ] ( ) را به لینک اضافه نکنید**
- پاسخ‌های مبهم یا ناقص ندهید
- اطلاعات نادرست یا قدیمی ارائه نکنید
- از زبان رسمی و خشک استفاده نکنید

**🔗 نحوه صحیح نوشتن لینک:**
❌ غلط: [دانلود فایل](https://example.com/file.pdf)
✅ درست: https://example.com/file.pdf

**🎨 فرمت پاسخ‌های شما:**
- از سرفصل‌بندی و فهرست استفاده کنید
- نکات مهم را با ** ** برجسته کنید
- لینک‌های دانلود را به صورت URL خام و ساده (بدون براکت یا پرانتز) ارائه دهید
- از فاصله‌گذاری مناسب برای خوانایی بهتر استفاده کنید

**💡 نکته طلایی:** هدف شما کمک به موفقیت تحصیلی دانشجویان است. هر پاسخ باید ارزشمند، کاربردی و الهام‌بخش باشد! سریع و دقیق پاسخ دهید.`;

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

    // Use gemini-2.5-flash for fast and high-quality multimodal responses
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          ...transformedMessages
        ],
        stream: true,
        temperature: 0.4,
        max_tokens: 16000,
        top_p: 0.95,
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
