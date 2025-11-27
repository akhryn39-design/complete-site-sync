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
    const { audio } = await req.json();
    
    if (!audio) {
      throw new Error("فایل صوتی ارسال نشده است");
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Use provided base64 audio directly and strip data URL prefix if present
    let base64Audio = audio as string;
    if (base64Audio.startsWith("data:")) {
      const commaIndex = base64Audio.indexOf(",");
      if (commaIndex !== -1) {
        base64Audio = base64Audio.slice(commaIndex + 1);
      }
    }

    console.log("Processing audio transcription, base64 length:", base64Audio.length);

    // Use Gemini for audio transcription with improved prompt
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `شما یک سیستم تبدیل گفتار به متن هستید. لطفاً این فایل صوتی را با دقت بالا گوش کنید و متن گفتار را به فارسی بنویسید.

قوانین مهم:
1. فقط متن گفتار را بنویسید - هیچ توضیح اضافی ننویسید
2. اگر صدا فارسی است، به فارسی بنویسید
3. اگر صدا انگلیسی است، به انگلیسی بنویسید  
4. از نشانه‌گذاری مناسب استفاده کنید
5. اگر چیزی نامفهوم است، از [...] استفاده کنید
6. صدا را کامل و دقیق متن‌نویسی کنید`
              },
              {
                type: "input_audio",
                input_audio: {
                  data: base64Audio,
                  format: "wav"
                }
              }
            ]
          }
        ],
        max_tokens: 4000,
        temperature: 0.1
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Transcription error:", response.status, errorText);
      throw new Error("خطا در تبدیل صدا به متن");
    }

    const data = await response.json();
    console.log("Transcription response:", JSON.stringify(data));
    
    const transcribedText = data.choices?.[0]?.message?.content || "";

    if (!transcribedText) {
      throw new Error("متنی از صدا استخراج نشد");
    }

    return new Response(
      JSON.stringify({ text: transcribedText.trim() }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Transcribe error:", error);
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
