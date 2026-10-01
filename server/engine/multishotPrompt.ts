// ============================================================================
// Chép từ app Đạo diễn AI 1.7 (multishotPrompt.ts). MỘT thay đổi duy nhất theo yêu cầu người dùng
// để tiết kiệm token: bỏ 2 trường dịch tiếng Việt chỉ để đọc (cameraVi, summaryVi). Mọi luật khác nguyên văn.
// ============================================================================
// ============================================================================
// Đạo diễn AI – Multishot v2
// promptText, responseSchema và bước ghép prompt cho /api/generate-multishot
// và /api/edit-beat. Chỉ dùng ở server.
// ============================================================================
import { Type } from '@google/genai';

export interface RefImage {
  name?: string;
  note?: string;
  base64?: string;
}

export interface BeatSettings {
  script: string;
  duration: number;
  referenceImages?: RefImage[];
  cinematicLevel?: string;
  promptType?: string;
  pacing?: string;
}

export interface Segment {
  shotNumber: number;
  duration: number;
  camera: string;
  cameraVi: string;
  text: string;
  summaryVi: string;
  addedByDirectorVi: string[];
  timeRange?: string;
}

export interface BeatResult {
  version: 2;
  mode: 'multishot' | 'continuous';
  analysis: any;
  warnings: string[];
  header: string;
  segments: Segment[];
  finalPrompt: string;
}

// Chỉ dùng cho những gì kịch bản BỎ TRỐNG (camera chưa ghi / chưa chia shot).
const CINEMATIC_GUIDANCE: Record<string, string> = {
  simple:
    'basic shot sizes (wide, medium, close-up) and mostly static framing; clear, simple storytelling.',
  medium:
    'a balanced mix of shot sizes; camera movement only when it clearly serves the action or emotion.',
  complex:
    'bold, dynamic cinematography: strong angles, expressive camera movement and stylized lighting, as long as the action stays readable.',
};

// Timestamp dùng giây nguyên nên nhịp nhanh = 1-2 giây/shot.
const PACING_GUIDANCE: Record<string, string> = {
  slow: 'average shot length 3-6 seconds; hold shots to build atmosphere.',
  medium: 'average shot length 2-4 seconds; natural, balanced rhythm.',
  fast: 'average shot length 1-2 seconds; rapid cuts, but only as many shots as the action really needs.',
};

export function normalizeMode(promptType?: string): 'multishot' | 'continuous' {
  return promptType === 'continuous' ? 'continuous' : 'multishot';
}

function refLabel(img: RefImage, i: number): string {
  return img.name && img.name.trim() ? img.name.trim() : `ref${i + 1}`;
}

/** Nhãn chèn ngay trước mỗi ảnh tham chiếu trong `parts` gửi cho Gemini. */
export function buildReferenceImageLabel(img: RefImage, i: number): string {
  return `[Image ${i + 1} = @${refLabel(img, i)}: ${img.note?.trim() || 'as shown in this image'}]`;
}

function buildReferenceList(referenceImages: RefImage[]): string {
  return referenceImages.length
    ? referenceImages
        .map((img, i) => `- [Image ${i + 1}] @${refLabel(img, i)}: ${img.note?.trim() || 'as shown in the image'}`)
        .join('\n')
    : '- (no reference images)';
}

function modeLabel(mode: 'multishot' | 'continuous'): string {
  return mode === 'continuous'
    ? 'LONG TAKE (one continuous shot, no cuts)'
    : 'MULTISHOT (several shots joined by hard cuts inside one clip)';
}

/** promptText cho lần dựng đầu tiên. */
export function buildMultishotPromptText(input: BeatSettings): string {
  const { script, duration } = input;
  const referenceImages = input.referenceImages || [];
  const mode = modeLabel(normalizeMode(input.promptType));
  const referenceList = buildReferenceList(referenceImages);
  const cinematicGuidance = CINEMATIC_GUIDANCE[input.cinematicLevel || ''] || CINEMATIC_GUIDANCE.medium;
  const pacingGuidance = PACING_GUIDANCE[input.pacing || ''] || PACING_GUIDANCE.medium;

  return `ROLE
You write ONE Veo 3.1 prompt for ONE beat that Veo renders in a single ${duration}-second generation. The beat can be any genre or medium: live action, animation, commercial, drama, action, comedy, horror, music video, documentary, etc.
The input is either (A) a directed script that already specifies shots, camera, actions, style and sound, or (B) a loose idea. Treat it per element: every element the script specifies is LOCKED and must be translated faithfully; every element it leaves open is yours to direct. Never override a locked element; make every element explicit enough that Veo cannot misread it.

INPUT
Mode: ${mode}
Total duration: ${duration} seconds
References (characters, props, locations, or a frame from the previous beat; the images are attached above in this order):
${referenceList}
Script:
${script}

STEP 1 - ANALYSE BEFORE WRITING (fill 'analysis' first)
a. Shots: if the script defines shots, list them in order; otherwise plan them (see STEP 3). For each shot: camera, action beats in order, dialogue lines, props and their state, lighting / atmosphere cues. Mark each element LOCKED or OPEN.
b. Extract the style, sound, music and dialogue information.
c. Blocking map per shot: each character/prop in frame -> screen position (left / center / right), depth (large in foreground / midground / small in background), facing and eyeline (who looks at whom), entry and exit paths, and whether they know what is about to happen.
d. Cause -> effect chain: for every result shown later, what the earlier shot must set up (trajectory, positions, timing) so the result looks inevitable.
e. Hidden events: any fall, impact, crash, explosion, transformation or complex hand-object action that must not be seen happening. In MULTISHOT these are the events the script places at a cut (the next shot opens with their result). In LONG TAKE these are events the script says happen out of view, or whose result appears without the action being shown. Note how each one will be hidden (see STEP 4). They must never be shown.
f. Continuity in: if a reference is a frame from the previous beat, the clip must open matching that frame (same positions, props, lighting).
g. Conflicts: anything physically impossible, contradicting the references, contradicting itself, or too much action or dialogue for the time. Never fix these silently; record each one in 'warnings'.

STEP 2 - HARD RULES (LOCKED elements)
1. Shot count and order exactly as the script. LONG TAKE = exactly one shot, no cuts.
2. Keep every camera instruction as written; never add a camera movement the script did not ask for.
3. Keep every action beat, in order, without simplifying.
4. Keep every lighting / atmosphere cue.
5. Style: the script's style line, complete, written once at the very top. Add nothing that contradicts it, and never mix realistic and cartoon descriptors.
6. Always write references exactly as their tag (@name).
7. Dialogue: exact words, in the language they are written in, never translated.
8. Never write two instructions that contradict each other. Merge them into one physically consistent action that keeps both intentions, or add a warning.

STEP 3 - OPEN ELEMENTS (direct them, always serving the script's intent)
- If the script does not define shots: split the beat with this pacing: ${pacingGuidance}
- If a shot has no camera: choose one with this cinematic level: ${cinematicGuidance} Without a clear reason for movement, prefer a static framing that shows the action most clearly.
- Blocking, entry/exit paths, gaze and awareness from the blocking map. If another entrance could be confused with the intended one, state that it stays closed.
- Timestamps inside a shot so that every beat gets enough screen time.
- Identity anchor: at the FIRST mention of each tag, add a short visual description taken from its note, in parentheses.
- Place a sound right before the action it causes.

STEP 4 - VEO WRITING RULES
- Each segment starts with the camera: shot size, height/angle, static or moving. For a moving camera, describe the start and the end framing.
- Visual vocabulary follows the style: live action may use lens, lighting and film-stock terms; animation uses animation terms. Stay consistent across segments.
- Express depth by size in the frame ("large in the foreground", "small in the distance"), never by "behind" alone.
- Concrete verbs; about one main action per 2 seconds. If a shot has more beats than fit, give it more seconds (whole seconds, at least 1 second per shot; all shots sum to ${duration}). If it still does not fit, add a warning.
- Dialogue: name the speaker and the delivery (tone, volume, emotion) before the quoted line, e.g. @anna whispers, trembling: "...". One line per speaker per segment. Each line must be speakable within its segment (about 2-3 words per second), otherwise add a warning. Write "no subtitles".
- MULTISHOT cuts: every shot after the first (the app puts "HARD CUT." in front of it) must describe a new camera position clearly different from the previous one (different height, an angle change of at least 30 degrees, or a clearly different shot size), described concretely.
- Hidden events in MULTISHOT: the shot before the cut states how it ends and that the event does not happen in it (e.g. "the glass tips over the table edge and leaves the frame; it does not hit the floor in this shot"). The shot after the cut opens with the finished state (e.g. "shards already lie scattered and still; the fall is never shown"). Use no motion verbs for the hidden event itself.
- Hidden events in LONG TAKE (there is no cut to hide behind): hide the event with ONE of these, whichever fits the script and the blocking: (1) occlusion: a character, object or piece of set passes in front of or blocks the spot while it happens; (2) the camera turns or pans away from the spot and comes back after it is over; (3) the event happens just outside the frame edge and only its sound and result are seen. Say explicitly which method is used and that the event itself is not visible (e.g. "a passing waiter blocks the view of the table; when he has passed, the glass already lies shattered on the floor").
- Final moment: describe the last frame of the beat explicitly; it may become the first frame of the next beat.
- Exclusions are written as precise positive descriptions of what IS visible.
- On-screen text, signs and logos: only if the script asks for them, with the exact words in quotes.
- Audio: continuous ambient sound once at the top; each one-off SFX inside the segment where it happens; the sound of a hidden impact exactly on the cut (MULTISHOT) or at the moment it happens out of view (LONG TAKE). Music: describe it if the script asks for it; otherwise write "no background music".
- LONG TAKE: each segment is one action beat inside the same continuous shot, and the camera never cuts or jumps.
  * Segment 1 starts by stating the camera's starting position, height and framing.
  * Every segment ends by stating the exact framing at its last moment (camera position, height, direction, shot size, and who/what is in frame where).
  * Every following segment begins with "Continuing without a cut," and continues from exactly that framing (do not restate it and never introduce a different camera position), then describes the continuous move (push in, pull back, pan, tilt, track, orbit, or holding still) and where it ends.
  * Keep camera moves smooth and physically possible for one camera in that space; changes of shot size happen only through camera or subject movement, never through a cut.
  * The 'camera' field of each segment summarises that segment's move as "from <framing> to <framing>".
- Keep it concise: about 120-250 words for 8 seconds, no filler adjectives.

STEP 5 - HOW YOUR TEXT IS ASSEMBLED
The app builds the final Veo prompt from your 'header' and 'segments':
  <header>
  [00:00-00:0X] <segment 1 text>
  [00:0X-00:0Y] HARD CUT. <segment 2 text>      (MULTISHOT only)
So: 'header' = style line, setting and lighting, "Ambient: ...", music line, and "No dialogue, no subtitles." when there is no dialogue. Each segment 'text' starts directly with the camera and ends with "SFX: ..." when it has sound effects. NEVER write timestamps or "HARD CUT." yourself: the app adds them from 'duration'. Never repeat the header inside a segment.

STEP 6 - SELF-CHECK before returning (fix the prompt if possible; otherwise add a warning)
- Every LOCKED element appears unchanged; every OPEN element serves the script's intent.
- Every effect has its visible setup earlier; the clip opens matching any previous-beat frame.
- No hidden event is shown or described with motion verbs (MULTISHOT), and each LONG TAKE hidden event uses one named hiding method.
- LONG TAKE: every segment starts exactly from the framing the previous segment ended on; no framing jumps.
- No contradictory instructions; every dialogue line fits its segment.
- Segment times are whole seconds and sum to ${duration}. Veo only renders 4, 6 or 8 seconds: if ${duration} is not one of these, add a warning.

OUTPUT (JSON, fields in this order)
- 'analysis': results of STEP 1, written BEFORE anything else.
- 'warnings': problems for the user, in Vietnamese, one sentence each; empty list if none.
- 'header': as described in STEP 5, in English.
- 'segments': one per shot (LONG TAKE: one per action beat), in order, each with: shotNumber, duration (whole seconds), camera (English), text (English; dialogue stays in its original language), addedByDirectorVi (Vietnamese list of everything in this segment that the script did NOT specify and you added; empty list if nothing).`;
}

/** promptText cho nút "Chỉnh lại" cả beat. */
export function buildEditBeatPromptText(
  input: BeatSettings,
  current: Pick<BeatResult, 'header' | 'segments' | 'warnings'>,
  userRequest: string
): string {
  const generationRules = buildMultishotPromptText(input);
  const currentJson = JSON.stringify(
    {
      header: current.header,
      segments: (current.segments || []).map((s) => ({
        shotNumber: s.shotNumber,
        duration: s.duration,
        camera: s.camera,
        text: s.text,
      })),
    },
    null,
    2
  );

  return `You are revising an existing Veo prompt for a beat. The rules you originally followed are below, followed by the current version and the user's change request.

===== ORIGINAL RULES AND INPUT =====
${generationRules}

===== CURRENT VERSION =====
${currentJson}

===== USER CHANGE REQUEST (may be written in Vietnamese) =====
${userRequest}

REVISION RULES
1. Change ONLY what the request asks for. Keep every other part of the current version word for word.
2. The request may override a LOCKED element of the script; outside what it asks, all LOCKED elements stay as the script says.
3. After the change, re-check the whole beat: if the change breaks a cause -> effect link, a hidden event, the blocking or the timing in another shot, adjust that shot as little as needed and mention it in that segment's addedByDirectorVi.
4. Segment durations are whole seconds and must still sum to the total duration unless the request explicitly changes it.
5. If the request is impossible or conflicts with the script, do what is possible and explain in 'warnings' (Vietnamese).
6. Return the COMPLETE updated beat in the same JSON format (analysis, warnings, header, segments).`;
}

const stringArray = { type: Type.ARRAY, items: { type: Type.STRING } };

/** responseSchema dùng chung cho dựng mới và chỉnh lại. Thứ tự trường là cố ý: phân tích trước, viết sau. */
export const BEAT_RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    analysis: {
      type: Type.OBJECT,
      properties: {
        shots: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              shotNumber: { type: Type.INTEGER },
              locked: { ...stringArray, description: 'Elements the script specifies' },
              open: { ...stringArray, description: 'Elements the script leaves open' },
              blocking: { type: Type.STRING, description: 'Screen position, depth, facing/eyeline, entry/exit, awareness' },
              causeEffect: { type: Type.STRING, description: 'What this shot must set up for later shots' },
              hiddenEvents: { type: Type.STRING, description: 'Events hidden at a cut, or "none"' },
            },
            required: ['shotNumber', 'locked', 'open', 'blocking', 'causeEffect', 'hiddenEvents'],
            propertyOrdering: ['shotNumber', 'locked', 'open', 'blocking', 'causeEffect', 'hiddenEvents'],
          },
        },
        continuityIn: { type: Type.STRING, description: 'How the clip matches a previous-beat frame, or "none"' },
        conflicts: { ...stringArray, description: 'Conflicts found in the script' },
      },
      required: ['shots', 'continuityIn', 'conflicts'],
      propertyOrdering: ['shots', 'continuityIn', 'conflicts'],
    },
    warnings: { ...stringArray, description: 'Problems for the user, in Vietnamese' },
    header: { type: Type.STRING, description: 'Style, setting, lighting, ambient, music, dialogue line' },
    segments: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          shotNumber: { type: Type.INTEGER },
          duration: { type: Type.INTEGER, description: 'Whole seconds' },
          camera: { type: Type.STRING },
          text: { type: Type.STRING, description: 'Segment prompt text without timestamp and without HARD CUT' },
          addedByDirectorVi: { ...stringArray, description: 'What was added beyond the script, in Vietnamese' },
        },
        required: ['shotNumber', 'duration', 'camera', 'text', 'addedByDirectorVi'],
        propertyOrdering: ['shotNumber', 'duration', 'camera', 'text', 'addedByDirectorVi'],
      },
    },
  },
  required: ['analysis', 'warnings', 'header', 'segments'],
  propertyOrdering: ['analysis', 'warnings', 'header', 'segments'],
};

function ts(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/** Gỡ những thứ Gemini lỡ tự viết (mốc giờ, HARD CUT, header kiểu cũ) để code ghép lại cho chuẩn. */
function cleanSegmentText(text: string): string {
  let t = String(text || '').trim();
  for (let i = 0; i < 3; i++) {
    t = t
      .replace(/^\[\s*\d{1,2}:\d{2}\s*-\s*\d{1,2}:\d{2}\s*\]\s*/i, '')
      .replace(/^shot\s*\d+\s*(\([^)]*\))?\s*:\s*/i, '')
      .replace(/^hard\s*cut\s*[.:]?\s*/i, '')
      .trim();
  }
  return t;
}

/** Ghép kết quả của Gemini thành BeatResult hoàn chỉnh: mốc giờ, HARD CUT, finalPrompt, cảnh báo thời lượng. */
export function assembleBeat(raw: any, mode: 'multishot' | 'continuous', totalDuration: number): BeatResult {
  const warnings: string[] = Array.isArray(raw?.warnings) ? raw.warnings.filter(Boolean).map(String) : [];
  const header = String(raw?.header || '').trim();
  const rawSegments: any[] = Array.isArray(raw?.segments) ? raw.segments : [];

  if (!header || rawSegments.length === 0) {
    throw new Error('Gemini trả về thiếu header hoặc segments.');
  }

  let cursor = 0;
  const segments: Segment[] = rawSegments.map((s, i) => {
    const dur = Math.max(1, Math.round(Number(s?.duration) || 1));
    const start = cursor;
    cursor += dur;
    return {
      shotNumber: i + 1,
      duration: dur,
      camera: String(s?.camera || ''),
      cameraVi: String(s?.cameraVi || ''),
      text: cleanSegmentText(s?.text),
      summaryVi: String(s?.summaryVi || ''),
      addedByDirectorVi: Array.isArray(s?.addedByDirectorVi) ? s.addedByDirectorVi.filter(Boolean).map(String) : [],
      timeRange: `${ts(start)}-${ts(cursor)}`,
    };
  });

  if (cursor !== totalDuration) {
    warnings.push(`Tổng thời lượng các đoạn là ${cursor}s, không khớp với ${totalDuration}s đã chọn.`);
  }
  if (![4, 6, 8].includes(cursor)) {
    warnings.push(`Veo chỉ tạo clip 4, 6 hoặc 8 giây; beat này đang là ${cursor}s.`);
  }
  const headerLine = mode === 'continuous' ? `${header} One continuous shot, no cuts.` : header;
  const body = segments
    .map((s, i) => {
      // Long take chia theo nhịp hành động, không cắt cảnh nên không có HARD CUT.
      const cut = mode === 'multishot' && i > 0 ? 'HARD CUT. ' : '';
      return `[${s.timeRange}] ${cut}${s.text}`;
    })
    .join('\n');

  return {
    version: 2,
    mode,
    analysis: raw?.analysis ?? null,
    warnings: Array.from(new Set(warnings)),
    header,
    segments,
    finalPrompt: `${headerLine}\n\n${body}`,
  };
}
