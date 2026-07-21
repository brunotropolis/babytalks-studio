/**
 * Publicação no Instagram via API do Instagram (Login do Instagram).
 * Base: graph.instagram.com. Suporta foto única, carrossel, reels e collabs.
 *
 * Fluxo geral (Content Publishing):
 *   1. criar container(s) de mídia  -> POST /{ig}/media
 *   2. (vídeo/reels) esperar processar -> GET /{creation}?fields=status_code até FINISHED
 *   3. publicar -> POST /{ig}/media_publish  { creation_id }
 *
 * A mídia precisa estar num URL PÚBLICO que os servidores da Meta consigam baixar.
 * Collabs: parâmetro `collaborators` = JSON array de usernames (máx 3).
 */

const GRAPH = "https://graph.instagram.com/v21.0";

export type MidiaItem = { url: string; tipo: "imagem" | "video" };

export type TipoPost = "imagem" | "carrossel" | "reels" | "stories";

export type PostInput = {
  igUserId: string;
  token: string;
  tipo: TipoPost;
  legenda?: string;
  midia: MidiaItem[];
  colaboradores?: string[]; // usernames, máx 3
  compartilharFeed?: boolean; // reels
  coverUrl?: string; // reels
};

export type PublishResult = { igMediaId: string; permalink?: string; semCollab?: boolean };

class IgError extends Error {
  constructor(msg: string, readonly raw?: unknown) {
    super(msg);
    this.name = "IgError";
  }
}

async function igPost(
  path: string,
  params: Record<string, string | undefined>,
): Promise<any> {
  const body = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== "") body.set(k, v);
  }
  const res = await fetch(`${GRAPH}/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json?.error) {
    throw new IgError(json?.error?.message || `HTTP ${res.status} em ${path}`, json);
  }
  return json;
}

async function igGet(path: string, token: string): Promise<any> {
  const sep = path.includes("?") ? "&" : "?";
  const res = await fetch(`${GRAPH}/${path}${sep}access_token=${encodeURIComponent(token)}`);
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json?.error) {
    throw new IgError(json?.error?.message || `HTTP ${res.status} em ${path}`, json);
  }
  return json;
}

/** Espera um container de vídeo/reels terminar de processar. */
async function esperarContainer(
  creationId: string,
  token: string,
  { tentativas = 30, intervaloMs = 4000 } = {},
): Promise<void> {
  for (let i = 0; i < tentativas; i++) {
    const r = await igGet(`${creationId}?fields=status_code,status`, token);
    if (r.status_code === "FINISHED") return;
    if (r.status_code === "ERROR" || r.status_code === "EXPIRED") {
      throw new IgError(`Processamento do vídeo falhou (${r.status_code}): ${r.status || ""}`, r);
    }
    await new Promise((res) => setTimeout(res, intervaloMs));
  }
  throw new IgError("Timeout: vídeo não terminou de processar a tempo.");
}

function collabsParam(colaboradores?: string[]): string | undefined {
  const c = (colaboradores || []).map((s) => s.trim().replace(/^@/, "")).filter(Boolean).slice(0, 3);
  return c.length ? JSON.stringify(c) : undefined;
}

/** Cria o container de mídia (retorna creation_id) conforme o tipo do post. */
async function criarContainer(input: PostInput): Promise<string> {
  const { igUserId, token, tipo, legenda, midia } = input;
  const collaborators = collabsParam(input.colaboradores);

  if (tipo === "imagem") {
    const item = midia[0];
    if (!item || item.tipo !== "imagem") throw new IgError("Post de imagem exige 1 imagem.");
    const r = await igPost(`${igUserId}/media`, {
      image_url: item.url,
      caption: legenda,
      collaborators,
      access_token: token,
    });
    await esperarContainer(r.id, token);
    return r.id;
  }

  if (tipo === "reels") {
    const item = midia[0];
    if (!item || item.tipo !== "video") throw new IgError("Reels exige 1 vídeo.");
    const r = await igPost(`${igUserId}/media`, {
      media_type: "REELS",
      video_url: item.url,
      caption: legenda,
      cover_url: input.coverUrl,
      share_to_feed: input.compartilharFeed === false ? "false" : "true",
      collaborators,
      access_token: token,
    });
    await esperarContainer(r.id, token);
    return r.id;
  }

  if (tipo === "stories") {
    const item = midia[0];
    if (!item) throw new IgError("Stories exige 1 foto ou vídeo.");
    const params: Record<string, string | undefined> = {
      media_type: "STORIES",
      access_token: token,
    };
    if (item.tipo === "imagem") params.image_url = item.url;
    else params.video_url = item.url;
    const r = await igPost(`${igUserId}/media`, params);
    // espera processar (imagem OU vídeo) — senão dá "Media ID is not available"
    await esperarContainer(r.id, token);
    return r.id;
  }

  // carrossel: cria filhos, depois o container pai
  if (midia.length < 2 || midia.length > 10) {
    throw new IgError("Carrossel exige de 2 a 10 itens.");
  }
  const filhos: string[] = [];
  for (const item of midia) {
    const params: Record<string, string | undefined> = {
      is_carousel_item: "true",
      access_token: token,
    };
    if (item.tipo === "imagem") params.image_url = item.url;
    else {
      params.media_type = "VIDEO";
      params.video_url = item.url;
    }
    const r = await igPost(`${igUserId}/media`, params);
    // espera CADA filho (imagem ou vídeo) terminar de processar — senão o
    // container pai dá "Media ID is not available" na hora de publicar.
    await esperarContainer(r.id, token);
    filhos.push(r.id);
  }
  const pai = await igPost(`${igUserId}/media`, {
    media_type: "CAROUSEL",
    children: filhos.join(","),
    caption: legenda,
    collaborators,
    access_token: token,
  });
  // e espera o próprio carrossel ficar pronto antes do media_publish
  await esperarContainer(pai.id, token);
  return pai.id;
}

// Erros transientes da Meta que costumam ser FALSO NEGATIVO no media_publish:
// a API responde erro mas o post sai mesmo assim. Ex.: OAuthException code 2
// "An unexpected error has occurred. Please retry your request later."
const ERRO_TRANSIENTE = /unexpected error|please retry|try again|temporarily|reduce the amount/i;

/** Publica um post completo (container -> media_publish). Retorna id + permalink. */
export async function publicarPost(input: PostInput): Promise<PublishResult> {
  // 1) cria o container. Se um @ de colaborador for inválido, a Meta responde
  // "Invalid user id" e bloqueia o post inteiro. Como isso acontece na criação
  // do container (nada foi publicado ainda), dá pra publicar SEM os collabs e
  // avisar depois. Sinaliza via semCollab pra UI/log deixar claro.
  let semCollab = false;
  let creationId: string;
  try {
    creationId = await criarContainer(input);
  } catch (e: any) {
    const m: string = (e?.message || "").toLowerCase();
    const temCollab = (input.colaboradores || []).length > 0;
    if (temCollab && m.includes("invalid user id")) {
      creationId = await criarContainer({ ...input, colaboradores: [] });
      semCollab = true;
    } else {
      throw e;
    }
  }

  // baseline: id da mídia mais recente ANTES de publicar — serve pra detectar se
  // um erro transiente foi na verdade um falso negativo (o post saiu mesmo assim).
  let baselineId: string | undefined;
  try {
    const antes = await listarMedia(input.token, input.igUserId, 1);
    baselineId = antes[0]?.id;
  } catch { /* best-effort */ }

  try {
    const pub = await igPost(`${input.igUserId}/media_publish`, {
      creation_id: creationId,
      access_token: input.token,
    });
    let permalink: string | undefined;
    try {
      const info = await igGet(`${pub.id}?fields=permalink`, input.token);
      permalink = info.permalink;
    } catch {
      /* permalink é best-effort */
    }
    return { igMediaId: pub.id, permalink, semCollab };
  } catch (e: any) {
    const msg: string = e?.message || "";
    const code = (e?.raw as any)?.error?.code;
    const transiente = ERRO_TRANSIENTE.test(msg) || code === 2;
    if (!transiente) throw e;
    // Confere no feed real por até ~30s se um post novo apareceu. Se apareceu,
    // o erro era falso negativo: retorna sucesso com o post que de fato saiu.
    for (let i = 0; i < 6; i++) {
      await new Promise((r) => setTimeout(r, 5000));
      try {
        const agora = await listarMedia(input.token, input.igUserId, 1);
        const novo = agora[0];
        if (novo && novo.id !== baselineId) {
          return { igMediaId: novo.id, permalink: novo.permalink, semCollab };
        }
      } catch { /* segue tentando */ }
    }
    throw e; // realmente não saiu
  }
}

/** Descobre o IG user id a partir do token (para bootstrap/config). */
export async function obterIgUserId(token: string): Promise<{ userId: string; username?: string }> {
  const r = await igGet(`me?fields=user_id,username`, token);
  return { userId: String(r.user_id ?? r.id), username: r.username };
}

/** Renova o token de longa duração (60 dias). Não precisa de app secret. */
export async function renovarToken(token: string): Promise<{ token: string; expiraEm: number }> {
  const r = await igGet(`refresh_access_token?grant_type=ig_refresh_token`, token);
  return { token: r.access_token, expiraEm: r.expires_in };
}

export type MediaPublicado = {
  id: string;
  caption: string;
  tipo: string; // IMAGE | VIDEO | CAROUSEL_ALBUM
  thumb: string;
  permalink: string;
  timestamp: string;
};

/** Lista as mídias já publicadas na conta (o feed real do Instagram). */
export async function listarMedia(token: string, igUserId: string, limit = 100): Promise<MediaPublicado[]> {
  const fields = "id,caption,media_type,media_url,thumbnail_url,permalink,timestamp";
  const r = await igGet(`${igUserId}/media?fields=${fields}&limit=${limit}`, token);
  return (r.data || []).map((m: any) => ({
    id: m.id,
    caption: m.caption || "",
    tipo: m.media_type || "",
    // vídeo: thumbnail_url é o poster; foto/carrossel: media_url é a 1ª imagem
    thumb: (m.media_type === "VIDEO" ? m.thumbnail_url : m.media_url) || m.thumbnail_url || m.media_url || "",
    permalink: m.permalink || "",
    timestamp: m.timestamp || "",
  }));
}
