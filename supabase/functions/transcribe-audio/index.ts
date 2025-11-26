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

    // Use Gemini for audio transcription
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
                text: "لطفاً این فایل صوتی را به صورت دقیق به متن فارسی تبدیل کن. فقط متن را بنویس و هیچ توضیح اضافی اضافه نکن."
              },
              {
                type: "audio",
                audio: {
                  data: base64Audio,
                  format: "webm"
                }
              }
            ]
          }
        ]
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Transcription error:", response.status, errorText);
      throw new Error("خطا در تبدیل صدا به متن");
    }

    const data = await response.json();
    const transcribedText = data.choices?.[0]?.message?.content || "";

    if (!transcribedText) {
      throw new Error("متنی از صدا استخراج نشد");
    }

    return new Response(
      JSON.stringify({ text: transcribedText }),
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
