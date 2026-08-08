import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createHash } from "https://deno.land/std@0.208.0/crypto/mod.ts"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-File-Name, Authorization",
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const fileName = req.headers.get("X-File-Name") || "file"
    const fileData = await req.arrayBuffer()

    // B2 credentials from environment
    const B2_KEY_ID = Deno.env.get("B2_KEY_ID")
    const B2_APPLICATION_KEY = Deno.env.get("B2_APPLICATION_KEY")
    const B2_BUCKET_NAME = Deno.env.get("B2_BUCKET_NAME")
    const B2_BUCKET_ID = Deno.env.get("B2_BUCKET_ID")

    if (!B2_KEY_ID || !B2_APPLICATION_KEY || !B2_BUCKET_NAME || !B2_BUCKET_ID) {
      throw new Error("Missing B2 credentials")
    }

    // 1. Authorize with B2
    const authHeader = btoa(`${B2_KEY_ID}:${B2_APPLICATION_KEY}`)
    const authRes = await fetch("https://api.backblazeb2.com/b2api/v2/b2_authorize_account", {
      method: "GET",
      headers: { Authorization: `Basic ${authHeader}` },
    })

    if (!authRes.ok) throw new Error("B2 auth failed")

    const auth = await authRes.json()
    const apiUrl = auth.apiUrl
    const authToken = auth.authorizationToken

    // 2. Get upload URL
    const urlRes = await fetch(`${apiUrl}/b2api/v2/b2_get_upload_url`, {
      method: "POST",
      headers: {
        Authorization: authToken,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ bucketId: B2_BUCKET_ID }),
    })

    if (!urlRes.ok) throw new Error("Failed to get upload URL")

    const urlData = await urlRes.json()
    const uploadUrl = urlData.uploadUrl
    const uploadAuthToken = urlData.authorizationToken

    // 3. Calculate SHA1
    const sha1 = await calculateSHA1(fileData)

    // 4. Upload to B2
    const uploadRes = await fetch(uploadUrl, {
      method: "POST",
      headers: {
        Authorization: uploadAuthToken,
        "X-Bz-File-Name": encodeURIComponent(fileName),
        "Content-Type": "application/octet-stream",
        "X-Bz-Content-Sha1": sha1,
      },
      body: fileData,
    })

    if (!uploadRes.ok) throw new Error("B2 upload failed")

    const result = await uploadRes.json()
    const fileId = result.fileId
    const b2FileName = result.fileName

    // 5. Get public URL
    const b2Url = `https://f${fileId.slice(0, 3)}.backblazeb2.com/file/${B2_BUCKET_NAME}/${b2FileName}`

    return new Response(
      JSON.stringify({ success: true, url: b2Url, fileId }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    )
  } catch (error) {
    console.error("Error:", error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    )
  }
})

async function calculateSHA1(data: ArrayBuffer): Promise<string> {
  const hashBuffer = await crypto.subtle.digest("SHA-1", data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("")
}
