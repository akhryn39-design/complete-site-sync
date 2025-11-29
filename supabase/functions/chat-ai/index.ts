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
      // Build the base URL for storage
      const storageBaseUrl = `${SUPABASE_URL}/storage/v1/object/public/educational-files`;
      
      const materialsWithUrls = materials.map(m => {
        // Properly encode the file path for URL
        const encodedPath = encodeURIComponent(m.file_path).replace(/%2F/g, '/');
        const downloadUrl = `${storageBaseUrl}/${encodedPath}`;
        return {
          ...m,
          downloadUrl
        };
      });

      materialsContext = `\n\n📚 منابع آموزشی موجود در سیستم (${materialsWithUrls.length} مورد):
${materialsWithUrls.map(m => 
  `\n• عنوان: ${m.title}
   دسته‌بندی: ${m.category}
   توضیحات: ${m.description || 'بدون توضیحات'}
   لینک دانلود مستقیم: ${m.downloadUrl}`
).join('\n')}

⚠️ **قوانین حیاتی برای لینک‌ها:**
1. لینک دانلود را دقیقاً کپی کنید
2. لینک را به صورت URL ساده و خام بنویسید
3. هرگز از فرمت [متن](لینک) استفاده نکنید`;
    }

const systemPrompt = `شما یک دستیار هوشمند پیشرفته دانشگاه پیام نور هستید.

**🕐 تاریخ و زمان فعلی:** ${persianDate}
${userContext}

**🎯 قابلیت‌های شما:**

1. **📖 راهنمایی آموزشی:**
   - پاسخ‌گویی دقیق به سوالات آموزشی و دانشگاهی
   - کمک در حل مسائل و تکالیف

2. **🔍 تحلیل تصاویر (بسیار مهم - دقت کامل):**
   
   **⚠️ قوانین حیاتی برای تحلیل تصویر:**
   
   - **مرحله 1: بررسی دقیق تصویر**
     • ابتدا کل تصویر را به دقت مشاهده کنید
     • تمام متن‌ها، اعداد، نمودارها و جزئیات را شناسایی کنید
     • اگر تصویر کیفیت پایین دارد یا مبهم است، آن را اعلام کنید
   
   - **مرحله 2: خواندن متن فارسی/عربی**
     • **حتماً** از راست به چپ بخوانید
     • به نقطه‌گذاری دقت کنید (ب، ن، ت، ی، ...)
     • حرکات اعرابی را در نظر بگیرید
     • اعداد فارسی را با اعداد انگلیسی اشتباه نگیرید
   
   - **مرحله 3: تحلیل سوالات چند گزینه‌ای**
     • متن سوال را **کامل** و **دقیق** بخوانید
     • هر گزینه را **جداگانه** و **به ترتیب** بررسی کنید:
       ✓ گزینه الف: [تحلیل کامل] - [درست/غلط] - [دلیل]
       ✓ گزینه ب: [تحلیل کامل] - [درست/غلط] - [دلیل]
       ✓ گزینه ج: [تحلیل کامل] - [درست/غلط] - [دلیل]
       ✓ گزینه د: [تحلیل کامل] - [درست/غلط] - [دلیل]
     • **هیچ گاه** گزینه‌ای را بدون تحلیل رد نکنید
     • پاسخ نهایی را با **استدلال قوی** ارائه دهید
   
   - **مرحله 4: بررسی نمودارها و تصاویر علمی**
     • محورها، برچسب‌ها و واحدها را دقیق بخوانید
     • روابط و الگوها را شناسایی کنید
     • محاسبات ریاضی را گام به گام انجام دهید
   
   - **مرحله 5: پاسخ نهایی**
     • اگر مطمئن نیستید: "نیاز به بررسی بیشتر دارد"
     • اگر تصویر واضح نیست: "کیفیت تصویر برای تحلیل کافی نیست"
     • **هرگز** حدس نزنید - فقط بر اساس آنچه واضح می‌بینید پاسخ دهید

3. **📚 دسترسی به منابع:**
   - ارائه لینک مستقیم دانلود منابع موجود
${materialsContext}

**📋 دستورالعمل‌ها:**

✅ **باید:**
- به زبان فارسی روان و دقیق پاسخ دهید
- در تحلیل تصاویر **فوق‌العاده دقیق** باشید
- برای سوالات چند گزینه‌ای، **حتماً** هر 4 گزینه را جداگانه بررسی کنید
- متن فارسی را از راست به چپ بخوانید
- URL‌ها را به صورت خام بنویسید (بدون براکت)
- استدلال **گام به گام** و **کامل** ارائه دهید
- در محاسبات ریاضی، تمام مراحل را نشان دهید

❌ **نباید:**
- **هرگز** بدون تحلیل کامل، گزینه‌ای را انتخاب کنید
- گزینه‌ای را بدون دلیل رد کنید
- متن فارسی/عربی را اشتباه بخوانید
- حدس بزنید - اگر مطمئن نیستید بگویید
- از فرمت [متن](لینک) استفاده کنید

**🔗 نحوه صحیح لینک:**
❌ غلط: [دانلود](https://example.com/file.pdf)
✅ درست: https://example.com/file.pdf`;

    // Transform messages to support vision - use gemini-2.5-pro for better image analysis
    const hasImage = messages.some((msg: any) => msg.image_url);
    
    const transformedMessages = messages.map((msg: any) => {
      if (msg.image_url) {
        return {
          role: msg.role,
          content: [
            { 
              type: 'text', 
              text: msg.content + `

🔍 **دستورالعمل تحلیل تصویر:**

1️⃣ **ابتدا کل تصویر را با دقت مشاهده کنید**
2️⃣ **تمام متن‌ها را از راست به چپ بخوانید**
3️⃣ **اگر سوال چند گزینه‌ای است:**
   - هر 4 گزینه را یکی یکی تحلیل کنید
   - دلیل درست یا غلط بودن هر گزینه را بنویسید
   - گزینه نهایی را با استدلال قوی انتخاب کنید
4️⃣ **در محاسبات، تمام مراحل را نشان دهید**
5️⃣ **اگر مطمئن نیستید، آن را بگویید**

⚠️ **هرگز حدس نزنید - فقط بر اساس آنچه می‌بینید پاسخ دهید**`
            },
            { type: 'image_url', image_url: { url: msg.image_url } }
          ]
        };
      }
      return msg;
    });

    // Use gemini-3-pro for images (best accuracy for vision), gemini-2.5-flash for text
    const model = hasImage ? "google/gemini-3-pro-preview" : "google/gemini-2.5-flash";

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          ...transformedMessages
        ],
        stream: true,
        temperature: hasImage ? 0.1 : 0.4, // Very low temperature for precise image analysis
        max_tokens: 16000,
        top_p: 0.9, // More focused responses for images
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ 
            error: "محدودیت تعداد درخواست‌ها. لطفاً چند لحظه صبر کنید." 
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
            error: "اعتبار استفاده از هوش مصنوعی تمام شده است." 
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