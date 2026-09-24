# Supabase Edge Function Setup for B2 Upload

## Step 1: Install Supabase CLI
```bash
npm install -g supabase
```

## Step 2: Login to Supabase
```bash
supabase login
```

## Step 3: Link to your project
```bash
supabase link --project-id qjjkfrncnarqifzkjnyc
```

## Step 4: Set environment secrets
```bash
supabase secrets set B2_KEY_ID=379cd0b52bbf
supabase secrets set B2_APPLICATION_KEY=004a72718b0ba180f5b742b7a1f4840d3c9ec904b4
supabase secrets set B2_BUCKET_NAME=STUDIO-ARCH
supabase secrets set B2_BUCKET_ID=0327892cfdc0dba592eb0b1f
```

## Step 5: Deploy edge function
```bash
supabase functions deploy b2-upload --no-verify
```

## Step 6: Get your function URL
Your edge function URL will be:
```
https://qjjkfrncnarqifzkjnyc.supabase.co/functions/v1/b2-upload
```

## Step 7: Update frontend
Update `src/utils/b2-upload.ts` with the new endpoint (see FRONTEND_UPDATE.md)

## Testing
```bash
curl -X POST https://qjjkfrncnarqifzkjnyc.supabase.co/functions/v1/b2-upload \
  -H "Content-Type: application/octet-stream" \
  -H "X-File-Name: test.txt" \
  --data-binary @test.txt
```
