import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, conversationHistory } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Build full conversation context
    const fullMessages = [
      {
        role: "system",
        content: `شما یک دستیار هوشمند دانشگاه پیام نور هستید. وظیفه شما کمک به دانشجویان در زمینه‌های زیر است:

1. پاسخ به سوالات آموزشی و دانشگاهی
2. راهنمایی در مورد رشته‌ها، دروس و برنامه‌های درسی
3. اطلاعات عمومی در مورد دانشگاه پیام نور
4. کمک در حل مسائل درسی و تکالیف
5. مشاوره تحصیلی

همیشه به زبان فارسی و با لحنی دوستانه، محترمانه و حرفه‌ای پاسخ دهید.
اگر سوالی خارج از حوزه تخصص شما بود، به کاربر اطلاع دهید که فقط در زمینه‌های آموزشی و دانشگاهی می‌توانید کمک کنید.`
      },
      ...(conversationHistory || []),
      ...messages
    ];

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: fullMessages,
        temperature: 0.7,
        max_tokens: 2000,
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

    const data = await response.json();
    const aiMessage = data.choices?.[0]?.message?.content;

    if (!aiMessage) {
      throw new Error("No response from AI");
    }

    return new Response(
      JSON.stringify({ message: aiMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Chat error:", error);
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
