import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * OCR Service — Bill Text Extraction
 * Accepts a base64-encoded image and extracts text using a simple regex-based parser.
 * Returns structured JSON with detected amount, date, and merchant.
 * 
 * NOTE: Since Tesseract.js is a Node.js library and edge functions run on Deno,
 * we use the Lovable AI gateway for image-to-text extraction instead.
 */

function parseAmount(text: string): number | null {
  // Match patterns like ₹1,234.56 or Rs. 1234 or INR 500 or Total: 1234.00
  const patterns = [
    /(?:total|amount|grand\s*total|net\s*amount|payable)[:\s]*[₹$]?\s*([\d,]+\.?\d*)/i,
    /[₹]\s*([\d,]+\.?\d*)/,
    /(?:Rs\.?|INR|USD)\s*([\d,]+\.?\d*)/i,
    /(?:total|amount)[:\s]*([\d,]+\.?\d*)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const value = parseFloat(match[1].replace(/,/g, ''));
      if (!isNaN(value) && value > 0) return value;
    }
  }
  return null;
}

function parseDate(text: string): string | null {
  const patterns = [
    /(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/,
    /(\d{4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,2})/,
    /((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[\s,]+\d{1,2}[\s,]+\d{2,4})/i,
    /(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[\s,]+\d{2,4})/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return match[1];
  }
  return null;
}

function parseMerchant(text: string): string | null {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 2);
  // First non-empty line that looks like a name (not a number or date)
  for (const line of lines.slice(0, 5)) {
    if (!/^\d/.test(line) && !/^(date|time|invoice|bill|receipt|total|amount|tax)/i.test(line)) {
      return line.substring(0, 80);
    }
  }
  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageBase64, imageUrl } = await req.json();

    if (!imageBase64 && !imageUrl) {
      return new Response(
        JSON.stringify({ error: "Provide imageBase64 or imageUrl" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use Lovable AI gateway for OCR
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "AI gateway not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const imageContent = imageBase64
      ? { type: "image_url" as const, image_url: { url: `data:image/jpeg;base64,${imageBase64}` } }
      : { type: "image_url" as const, image_url: { url: imageUrl } };

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: "Extract ALL text from this bill/receipt image. Return the raw text exactly as it appears, preserving line breaks." },
              imageContent,
            ],
          },
        ],
      }),
    });

    const aiData = await aiResponse.json();
    const extractedText = aiData.choices?.[0]?.message?.content || "";

    const result = {
      extractedText,
      detectedAmount: parseAmount(extractedText),
      detectedDate: parseDate(extractedText),
      detectedMerchant: parseMerchant(extractedText),
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
