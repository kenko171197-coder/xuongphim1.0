import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import 'dotenv/config';
import { requestContext, generateWithFallback, newUsage, currentUsage, testKey, KeyPool, KeyOrder } from './server/ai';
import { modelInfo } from './shared/models';
import { knowledgeStatus, scriptTypes } from './server/knowledge';
import {
  validIdeasRequest, ideasPrompt, IDEAS_SCHEMA, normalizeIdeas,
  validSettings, outlinePrompt, OUTLINE_SCHEMA, normalizeOutline,
  assetsPrompt, ASSETS_SCHEMA, normalizeAssets,
  validMatch, matchParts, MATCH_SCHEMA, normalizeMatches,
  validLocationRequest, anglesParts, ANGLES_SCHEMA, normalizeAngles,
  STYLE_PROMPT, STYLE_SCHEMA, str,
} from './server/steps';
import {
  SHOTS_SCHEMA, shotsPrompt, normalizeShots,
  CLIP_PROMPT_SCHEMA, clipPromptText, assembleClipPrompt,
  REVIEW_SCHEMA, reviewParts, normalizeReview, modelLimits,
} from './server/production';
import { validImages } from './server/steps';
import type { Assets, Clip, Idea, Outline, SceneShots } from './shared/types';

/** Gọi Gemini, ép trả JSON theo khuôn. `task` quyết định model (bảng ở tab Cài đặt). */
async function askJson(prompt: string | any[], schema: any, temperature: number, task: string) {
  const parts = typeof prompt === 'string' ? [{ text: prompt }] : prompt;
  const response = await generateWithFallback(
    { contents: [{ role: 'user', parts }], config: { temperature, responseMimeType: 'application/json', responseSchema: schema } },
    task
  );
  try {
    return JSON.parse(response.text || 'null');
  } catch {
    throw new Error('Gemini trả về dữ liệu hỏng (có thể do quá dài). Thử lại một lần nữa.');
  }
}

/** Bọc route: bắt lỗi, trả thông báo tiếng Việt, kèm số token đã dùng. */
const route = (label: string, handler: (req: any) => Promise<any>) => async (req: any, res: any) => {
  try {
    const data = await handler(req);
    res.json({ ...data, usage: currentUsage() });
  } catch (error: any) {
    console.error(`${label}:`, error);
    res.status(502).json({ error: `${label}: ${error?.message || 'Gemini lỗi'}`, usage: currentUsage() });
  }
};

const needIdea = (body: any): Idea => {
  const idea = body?.idea;
  if (!idea?.logline) throw new Error('Dự án thiếu thẻ ý tưởng.');
  return idea;
};
const needOutline = (body: any): Outline => {
  const o = body?.outline;
  if (!o || !Array.isArray(o.scenes) || !o.scenes.length) throw new Error('Chưa có outline. Làm bước 2 trước.');
  return o;
};

const needAssets = (body: any): Assets => {
  const a = body?.assets;
  if (!a || !Array.isArray(a.characters) || !Array.isArray(a.locations)) throw new Error('Chưa có tài sản. Làm bước 3 trước.');
  return a;
};
const needClip = (body: any): Clip => {
  const c = body?.clip;
  if (!c?.id || !Array.isArray(c.shots) || !c.shots.length) throw new Error('Thiếu dữ liệu clip.');
  return c;
};

const OPEN_ROUTES = new Set(['/health', '/knowledge', '/test-key']);

async function startServer() {
  const app = express();
  const PORT = 3000;
  app.use(express.json({ limit: '50mb' }));

  // Mọi route gọi AI đều cần key của người dùng (nhập ở tab Cài đặt, gửi kèm header, server không lưu).
  app.use('/api', (req, res, next) => {
    if (OPEN_ROUTES.has(req.path)) return next();
    const keys: KeyPool = { free: [], paid: [] };
    try {
      const raw = req.headers['x-gemini-keys'];
      if (typeof raw === 'string' && raw) {
        const parsed = JSON.parse(decodeURIComponent(raw));
        const clean = (a: any) => (Array.isArray(a) ? a.map((k) => String(k).trim()).filter((k) => k.length > 10) : []);
        keys.free = Array.from(new Set(clean(parsed.free)));
        keys.paid = Array.from(new Set(clean(parsed.paid))).filter((k) => !keys.free.includes(k));
      }
    } catch {
      /* bỏ qua */
    }
    if (!keys.free.length && !keys.paid.length) return res.status(401).json({ error: 'Chưa có API key. Vào Cài đặt để thêm key.' });
    let models: Record<string, string> = {};
    try {
      const raw = req.headers['x-gemini-models'];
      if (typeof raw === 'string' && raw) models = JSON.parse(decodeURIComponent(raw));
    } catch {
      models = {};
    }
    const order: KeyOrder = req.headers['x-key-order'] === 'model-first' ? 'model-first' : 'free-first';
    requestContext.run({ keys, usage: newUsage(), models, order }, next);
  });

  app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

  // Kho kiến thức: danh sách thể loại + tình trạng các file (tab Cài đặt)
  app.get('/api/knowledge', (_req, res) => res.json({ scriptTypes: scriptTypes(), status: knowledgeStatus(), limits: modelLimits() }));

  // Kiểm tra một key trên từng model app hay dùng. Giới hạn miễn phí tính theo PROJECT, không theo key.
  app.post('/api/test-key', async (req, res) => {
    const key = String(req.body?.key || '').trim();
    if (!key) return res.status(400).json({ error: 'Thiếu key.' });
    const friendly = (e: any) => {
      const raw = String(e?.message || '');
      if (/api key not valid|api_key_invalid|unauthenticated/i.test(raw)) return 'Key không hợp lệ';
      if (/limit: 0|limit=0/i.test(raw)) return 'Không có ở bậc của key này';
      if (/perday|per day|requestsperday/i.test(raw)) return 'Hết lượt trong ngày';
      if (/quota|resource_exhausted|429/i.test(raw)) return 'Đang chạm giới hạn lượt';
      if (/not found|404/i.test(raw)) return 'Model không tồn tại với key này';
      return raw.slice(0, 140) || 'Lỗi';
    };
    const results: { model: string; name: string; ok: boolean; message: string }[] = [];
    for (const model of ['gemini-3.8-flash', 'gemini-3.1-flash-lite', 'gemini-3.1-pro-preview']) {
      try {
        await testKey(key, model);
        results.push({ model, name: modelInfo(model)?.name || model, ok: true, message: 'Dùng được' });
      } catch (e: any) {
        results.push({ model, name: modelInfo(model)?.name || model, ok: false, message: friendly(e) });
        if (/Key không hợp lệ/.test(friendly(e))) break;
      }
    }
    if (!results.some((r) => r.ok)) return res.status(400).json({ error: results.map((r) => `${r.name}: ${r.message}`).join('; '), results });
    res.json({ ok: true, results });
  });

  // Bước 1 — ý tưởng
  app.post('/api/ideas', route('Không tạo được ý tưởng', async (req) => {
    const r = validIdeasRequest(req.body);
    return normalizeIdeas(await askJson(ideasPrompt(r), IDEAS_SCHEMA, 1, 'ideas'), r);
  }));

  // Bước 2 — outline (viết mới hoặc sửa theo góp ý)
  app.post('/api/outline', route('Không viết được outline', async (req) => {
    const settings = validSettings(req.body?.settings);
    const idea = needIdea(req.body);
    const feedback = str(req.body?.feedback, 2000);
    const previous: Outline | undefined = feedback && req.body?.previous?.scenes ? req.body.previous : undefined;
    const raw = await askJson(outlinePrompt(settings, idea, feedback, previous), OUTLINE_SCHEMA, 0.8, 'outline');
    return { outline: normalizeOutline(raw, idea) };
  }));

  // Bước 3 — tài sản (viết mới hoặc sửa theo góp ý)
  app.post('/api/assets', route('Không tạo được tài sản', async (req) => {
    const settings = validSettings(req.body?.settings);
    const idea = needIdea(req.body);
    const outline = needOutline(req.body);
    const style = str(req.body?.style, 600);
    if (style.length < 8) throw new Error('Chưa chốt style của phim.');
    const feedback = str(req.body?.feedback, 2000);
    const previous: Assets | undefined = feedback && req.body?.previous ? req.body.previous : undefined;
    const raw = await askJson(assetsPrompt(settings, idea, outline, style, feedback, previous), ASSETS_SCHEMA, 0.7, 'assets');
    return { assets: normalizeAssets(raw, outline, style) };
  }));

  // Bước 3 — bối cảnh lượt 2: đọc ảnh góc a thật, sửa sơ đồ, viết prompt góc phụ
  app.post('/api/location-angles', route('Không viết được góc phụ', async (req) => {
    const settings = validSettings(req.body?.settings);
    const idea = needIdea(req.body);
    const outline = needOutline(req.body);
    const style = str(req.body?.style, 600);
    const { location, image, extra } = validLocationRequest(req.body);
    const raw = await askJson(anglesParts(settings, idea, outline, style, location, image, extra), ANGLES_SCHEMA, 0.5, 'assets');
    return { location: normalizeAngles(raw, location, style) };
  }));

  // Bước 4 — shot list cho một scene (viết mới hoặc sửa theo góp ý)
  app.post('/api/shotlist', route('Không viết được shot list', async (req) => {
    const settings = validSettings(req.body?.settings);
    const idea = needIdea(req.body);
    const outline = needOutline(req.body);
    const assets = needAssets(req.body);
    const sceneId = str(req.body?.sceneId, 10);
    const feedback = str(req.body?.feedback, 2000);
    const previous: SceneShots | undefined = feedback && Array.isArray(req.body?.previous?.clips) ? req.body.previous : undefined;
    const r = {
      settings, idea, outline, assets, sceneId, feedback, previous,
      images: typeof req.body?.images === 'object' && req.body.images ? req.body.images : {},
      prevClip: req.body?.prevClip?.shots ? (req.body.prevClip as Clip) : undefined,
    };
    const raw = await askJson(shotsPrompt(r), SHOTS_SCHEMA, 0.6, 'shotlist');
    return { shots: normalizeShots(raw, r) };
  }));

  // Bước 5 — biên dịch một clip sang prompt cho Flow
  app.post('/api/clip-prompt', route('Không biên dịch được prompt', async (req) => {
    const settings = validSettings(req.body?.settings);
    const assets = needAssets(req.body);
    const clip = needClip(req.body);
    const r = { settings, assets, clip, state: str(req.body?.state, 1500), timeOfDay: str(req.body?.timeOfDay, 40), feedback: str(req.body?.feedback, 1500) };
    const raw = await askJson(clipPromptText(r), CLIP_PROMPT_SCHEMA, 0.4, 'prompt');
    return { prompt: assembleClipPrompt(raw, r) };
  }));

  // Bước 6 — duyệt clip đã chạy, viết câu sửa, chấm khung cuối
  app.post('/api/review', route('Không duyệt được clip', async (req) => {
    const settings = validSettings(req.body?.settings);
    const assets = needAssets(req.body);
    const clip = needClip(req.body);
    const images = validImages(req.body?.images, 3);
    const note = str(req.body?.note, 2000);
    if (!note && !images.length) throw new Error('Hãy ghi nhận xét hoặc gửi ít nhất một ảnh chụp từ video.');
    const r = { settings, assets, clip, prompt: str(req.body?.prompt, 12000), note, images, checkFrame: !!req.body?.checkFrame && images.length > 0 };
    const raw = await askJson(reviewParts(r), REVIEW_SCHEMA, 0.3, 'review');
    return { review: normalizeReview(raw, r) };
  }));

  // Quét ảnh người dùng nạp về, gán @tag
  app.post('/api/match-images', route('Không quét được ảnh', async (req) => {
    const { images, tags } = validMatch(req.body);
    const raw = await askJson(matchParts(images, tags), MATCH_SCHEMA, 0.2, 'match');
    return { matches: normalizeMatches(raw, images.length, tags) };
  }));

  // Đọc style từ ảnh tham chiếu
  app.post('/api/style-from-image', route('Không đọc được style từ ảnh', async (req) => {
    const image = req.body?.image;
    if (!image || typeof image.data !== 'string' || image.data.length < 100) throw new Error('Chưa có ảnh.');
    const mime = /^image\/(png|jpeg|webp)$/.test(image.mime) ? image.mime : 'image/jpeg';
    const raw = await askJson([{ text: STYLE_PROMPT }, { inlineData: { mimeType: mime, data: image.data } }], STYLE_SCHEMA, 0.3, 'style');
    const style = str(raw?.style, 600).replace(/^style:\s*/i, '');
    if (!style) throw new Error('Gemini không trả về style.');
    return { style, summary: str(raw?.summary, 400) };
  }));

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => res.sendFile(path.join(distPath, 'index.html')));
  }

  app.listen(PORT, '0.0.0.0', () => console.log(`Xưởng phim 2 chạy tại http://localhost:${PORT}`));
}

startServer().catch((err) => {
  console.error('Không khởi động được server:', err);
  process.exit(1);
});
