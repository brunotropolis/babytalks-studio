import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin, BUCKET } from "@/lib/supabase";

export const runtime = "nodejs";
export const maxDuration = 60;

/** Recebe um arquivo (multipart), sobe no Storage público e devolve o URL. */
export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("file") as File | null;
    if (!file) return NextResponse.json({ erro: "sem arquivo" }, { status: 400 });

    const ehVideo = file.type.startsWith("video/");
    const ext = (file.name.split(".").pop() || (ehVideo ? "mp4" : "jpg")).toLowerCase();
    // nome único sem depender de Date/random no server: timestamp do próprio upload
    const nome = `${Date.now()}-${Math.round(performance.now())}.${ext}`;

    const sb = supabaseAdmin();
    const buf = Buffer.from(await file.arrayBuffer());
    const { error } = await sb.storage.from(BUCKET).upload(nome, buf, {
      contentType: file.type || (ehVideo ? "video/mp4" : "image/jpeg"),
      upsert: false,
    });
    if (error) return NextResponse.json({ erro: error.message }, { status: 500 });

    const { data } = sb.storage.from(BUCKET).getPublicUrl(nome);
    return NextResponse.json({
      url: data.publicUrl,
      tipo: ehVideo ? "video" : "imagem",
    });
  } catch (e: any) {
    return NextResponse.json({ erro: e?.message || "falha no upload" }, { status: 500 });
  }
}
