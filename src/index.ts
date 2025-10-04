// src/index.ts
import { AppServer, AppSession } from "@mentra/sdk";
import fs from "fs";
import path from "path";

// ---------- App config ----------
const PACKAGE_NAME = process.env.PACKAGE_NAME || "org.movenanter.rsc";
const PORT = Number(process.env.PORT || 3000);
const MENTRAOS_API_KEY = process.env.MENTRAOS_API_KEY;
if (!MENTRAOS_API_KEY) {
  console.error("MENTRAOS_API_KEY environment variable is required");
  process.exit(1);
}

// Metronome
const TICK_URL =
  (process.env.TICK_URL ||
    "https://cdn.pixabay.com/audio/2022/03/24/audio_719bb3b0e5.mp3").trim();
const TICK_VOLUME = Math.min(1, Math.max(0, Number(process.env.TICK_VOLUME || "0.5")));

// Gemini 2.5
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
  GEMINI_MODEL
)}:generateContent`;

// Photo save directory (configurable via SAVE_DIR, defaults to ./hands-positioning)
const SAVE_DIR = path.resolve(process.cwd(), process.env.SAVE_DIR || "hands-positioning");

// ---------- Types & state ----------
type BPM = 100 | 110 | 120;
type AppState = "welcome" | "safety_check" | "responsiveness_check" | "compressions" | "settings";

type IntentName =
  | "START"
  | "CONFIRM_SAFETY"
  | "HAZARD_PRESENT"
  | "EMERGENCY_CALLED"
  | "RESPONSIVE_YES"
  | "RESPONSIVE_NO"
  | "CHECK_HANDS"
  | "CHANGE_BPM"
  | "OPEN_SETTINGS"
  | "BACK_TO_COMPRESSIONS"
  | "UNKNOWN";

interface IntentResult {
  intent: IntentName;
  meta?: Record<string, any>;
}

interface RescueSessionState {
  currentState: AppState;
  compressionCount: number;
  emergencyConfirmed: boolean;
  metronomeBPM: BPM;
  saveForQA: boolean;

  speechGuardUntil?: number;       // pause ticks while TTS is speaking
  metronomeTimer?: NodeJS.Timeout; // setInterval handle
}

interface SessionContext {
  state: RescueSessionState;
  unsubscribes: Array<() => void>;
  ttsQueue: string[];
  ttsPlaying: boolean;
}

// Settings keys (optional if you set them in console)
const SETTING_SAVE_FOR_QA = "save_for_qa";
const SETTING_METRONOME_BPM = "metronome_bpm";

// ---------- Helpers ----------
const RE_TRUE = /^(true|1|yes)$/i;
function isFinal(v: any) {
  return v === true || (typeof v === "string" && RE_TRUE.test(v));
}
function norm(s: string) {
  return (s || "").toLowerCase().trim();
}
function initialState(): RescueSessionState {
  return {
    currentState: "welcome",
    compressionCount: 0,
    emergencyConfirmed: false,
    metronomeBPM: 110,
    saveForQA: true,
  };
}

// ---------- Gemini NLU ----------
const INTENT_SYSTEM_PROMPT = `
You are an intent classifier for a voice-only CPR coaching app.
Return ONLY JSON with key "intent" (and optional "meta").
Valid intent values:
START, CONFIRM_SAFETY, HAZARD_PRESENT, EMERGENCY_CALLED, RESPONSIVE_YES, RESPONSIVE_NO,
CHECK_HANDS, CHANGE_BPM, OPEN_SETTINGS, BACK_TO_COMPRESSIONS, UNKNOWN

Classify by meaning, not keywords.

If the user is answering whether the person responded, interpret short answers like "yes", "no" accordingly.

Output must be JSON only (no prose).
`;

async function classifyIntentWithGemini(
  utterance: string,
  contextState: AppState
): Promise<IntentResult | null> {
  if (!GEMINI_API_KEY) return null;
  try {
    const prompt =
      `${INTENT_SYSTEM_PROMPT}\n` +
      `Context state: ${contextState}\n` +
      `Utterance: ${utterance}\n`;

    const body = {
      contents: [{ role: "user", parts: [{ text: prompt }]}],
      generationConfig: { temperature: 0.0, topP: 1.0, maxOutputTokens: 128 },
    };

    const res = await fetch(`${GEMINI_ENDPOINT}?key=${encodeURIComponent(GEMINI_API_KEY)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) return null;

    const json = (await res.json()) as any;
    const raw = json?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    const parsed = JSON.parse((raw || "").trim());
    const intent = (parsed?.intent || "UNKNOWN") as IntentName;
    return { intent, meta: parsed?.meta || {} };
  } catch {
    return null;
  }
}

// ---------- Heuristic NLU (STATE-AWARE!) ----------
function classifyIntentHeuristic(text: string, state: AppState): IntentResult {
  const t = norm(text);

  // State-aware shortcuts for responsiveness_check
  if (state === "responsiveness_check") {
    // clear negatives
    if (
      /\b(no|nope|nah|negative)\b/.test(t) ||
      /(did\s*(not|n't)\s*respond)/.test(t) ||
      /\b(not\s*respond(ing)?)\b/.test(t) ||
      /\bunresponsive\b/.test(t)
    ) {
      return { intent: "RESPONSIVE_NO" };
    }
    // clear positives
    if (
      /\b(yes|yeah|yep|affirmative|they did respond|they responded|they answered|responding)\b/.test(t)
    ) {
      return { intent: "RESPONSIVE_YES" };
    }
  }

  // Hazards first (strong signal)
  if (/\b(not\s+safe|unsafe|hazard|danger|risky|not\s+clear)\b/.test(t)) {
    return { intent: "HAZARD_PRESENT" };
  }

  // Start
  if (/\b(start(ing)?|begin|start over|again)\b/.test(t)) return { intent: "START" };

  // Safety confirmations (broad phrasing)
  if (
    /\b(it'?s\s+safe|safe|all\s+clear|clear|it'?s\s+ok(ay)?|we('?re)?\s+good|good\s+to\s+go|looks\s+fine|should\s+be\s+safe|seems\s+safe)\b/.test(
      t
    )
  ) {
    return { intent: "CONFIRM_SAFETY" };
  }

  // Emergency called
  if (/(i|we).*(called|dialed).*(911|emergency)|\b(911|emergency)\b.*(called|on the line)/.test(t)) {
    return { intent: "EMERGENCY_CALLED" };
  }

  // Generic responsiveness (outside explicit state)
  if (/\b(responding|they answered|they'?re ok|they'?re okay|responsive|came to)\b/.test(t)) {
    return { intent: "RESPONSIVE_YES" };
  }
  if (
    /\b(no response|not responding|unresponsive|won'?t wake|isn'?t waking)\b/.test(t) ||
    /(did\s*(not|n't)\s*respond)/.test(t)
  ) {
    return { intent: "RESPONSIVE_NO" };
  }

  // Hands / speed / settings / back
  if (/\b(check|center|hands|position|placement)\b/.test(t)) return { intent: "CHECK_HANDS" };
  if (
    /\b(change.*(speed|bpm)|speed\s*up|slow\s*down|faster|slower|increase\s*speed|decrease\s*speed)\b/.test(
      t
    )
  )
    return { intent: "CHANGE_BPM" };
  if (/\b(settings|open settings|configure)\b/.test(t)) return { intent: "OPEN_SETTINGS" };
  if (/\b(back|resume compressions|go back)\b/.test(t)) return { intent: "BACK_TO_COMPRESSIONS" };

  return { intent: "UNKNOWN" };
}

async function classifyIntent(text: string, state: AppState): Promise<IntentResult> {
  // Try Gemini first, state provided
  const gem = await classifyIntentWithGemini(text, state);
  if (gem && gem.intent && gem.intent !== "UNKNOWN") return gem;

  // Then robust state-aware heuristics
  const heur = classifyIntentHeuristic(text, state);
  return heur;
}

// ---------- App ----------
class RescueApp extends AppServer {
  private ctxMap = new Map<string, SessionContext>();
  private tickInFlight = new Map<string, boolean>();

  constructor() {
    super({ packageName: PACKAGE_NAME, apiKey: MENTRAOS_API_KEY!, port: PORT });
  }

  private ctx(sessionId: string) {
    const c = this.ctxMap.get(sessionId);
    if (!c) throw new Error("No session context");
    return c;
  }
  private addSub(sessionId: string, unsub: () => void) {
    this.ctx(sessionId).unsubscribes.push(unsub);
    this.addCleanupHandler(unsub);
  }

  // TTS queue
  private async queueTTS(session: AppSession, sessionId: string, msg: string) {
    const c = this.ctx(sessionId);
    c.ttsQueue.push(msg);
    if (!c.ttsPlaying) await this.playNext(session, sessionId);
  }
  private async playNext(session: AppSession, sessionId: string): Promise<void> {
    const c = this.ctx(sessionId);
    if (c.ttsQueue.length === 0) {
      c.ttsPlaying = false;
      return;
    }
    c.ttsPlaying = true;
    const msg = c.ttsQueue.shift()!;
    try {
      c.state.speechGuardUntil = Date.now() + 2200;
      const r = await session.audio.speak(msg, { voice_settings: { speed: 1 } });
      if (!r.success) session.logger.error("TTS failed");
    } catch (e) {
      session.logger.error("TTS exception: " + String(e));
    }
    setTimeout(() => this.playNext(session, sessionId), 250);
  }
  private async stopAllAudio(session: AppSession) {
    try { await session.audio.stopAudio(); } catch {}
  }

  // Metronome
  private async tick(session: AppSession, sessionId: string) {
    if (this.tickInFlight.get(sessionId)) return;
    this.tickInFlight.set(sessionId, true);
    try {
      const res = await session.audio.playAudio({ audioUrl: TICK_URL, volume: TICK_VOLUME });
      if (!res?.success) {
        await session.audio.speak("tick", { voice_settings: { speed: 1.2 } });
      }
    } catch {
      try { await session.audio.speak("tick", { voice_settings: { speed: 1.2 } }); } catch {}
    } finally {
      this.tickInFlight.set(sessionId, false);
    }
  }
  private startMetronome(session: AppSession, sessionId: string) {
    const c = this.ctx(sessionId);
    const period = Math.round(60000 / c.state.metronomeBPM);
    this.stopMetronome(sessionId);

    session.logger.info(`Metronome start @ ${c.state.metronomeBPM} BPM`);
    this.tickInFlight.set(sessionId, false);

    c.state.metronomeTimer = setInterval(async () => {
      if (c.state.speechGuardUntil && Date.now() < c.state.speechGuardUntil) return;
      if (this.tickInFlight.get(sessionId)) return;

      c.state.compressionCount++;
      await this.tick(session, sessionId);

      if (c.state.compressionCount % 10 === 0) {
        c.state.speechGuardUntil = Date.now() + 1100;
        this.queueTTS(session, sessionId, String(c.state.compressionCount));
      }
      if (c.state.compressionCount % 220 === 0) {
        c.state.speechGuardUntil = Date.now() + 2200;
        this.queueTTS(session, sessionId, "Two minutes completed. Consider reassessing or swapping rescuers.");
      }
    }, period);
  }
  private stopMetronome(sessionId: string) {
    const c = this.ctxMap.get(sessionId);
    if (!c) return;
    if (c.state.metronomeTimer) {
      clearInterval(c.state.metronomeTimer);
      c.state.metronomeTimer = undefined;
    }
    this.tickInFlight.set(sessionId, false);
  }

  // ---- Real photo capture + optional local save to SAVE_DIR ----
  private async captureHandsPhoto(session: AppSession, sessionId: string) {
    const c = this.ctx(sessionId);

    // Briefly gate ticks so TTS/capture announcements are clean
    c.state.speechGuardUntil = Date.now() + 2500;

    if (!session.capabilities?.hasCamera) {
      await this.queueTTS(session, sessionId, "I can't access a camera on this device, but keep compressions centered.");
      return;
    }

    await this.queueTTS(session, sessionId, "Taking a quick photo to check hand position.");

    try {
      // Use a small size for speed during CPR. You can switch to "medium"/"large" if needed.
      const photo: any = await session.camera.requestPhoto({ size: "small" });

      // Normalize to Buffer for Node write.
      const buf: Buffer =
        Buffer.isBuffer(photo?.buffer)
          ? photo.buffer
          : Buffer.from(photo?.buffer ?? []);

      session.logger.info(
        `Photo captured: name=${photo?.filename ?? "n/a"} bytes=${buf.byteLength} mime=${photo?.mimeType ?? "image/jpeg"}`
      );

      if (c.state.saveForQA) {
        try { fs.mkdirSync(SAVE_DIR, { recursive: true }); } catch {}
        const safeSession = String(sessionId).replace(/[^a-zA-Z0-9_-]/g, "_");
        const outPath = path.join(SAVE_DIR, `hands_${safeSession}_${Date.now()}.jpg`);
        fs.writeFileSync(outPath, buf);
        session.logger.info(`Hands photo saved: ${outPath}`);
        await this.queueTTS(session, sessionId, "Photo saved. Hands centered—keep going.");
      } else {
        await this.queueTTS(session, sessionId, "Photo taken. Hands centered—keep going.");
      }
    } catch (err) {
      session.logger.error("Photo capture failed:", err);
      await this.queueTTS(session, sessionId, "I couldn't take a photo. Keep compressions centered on the chest.");
    }
  }

  // Flow
  private async enterWelcome(session: AppSession, sessionId: string) {
    const c = this.ctx(sessionId);
    c.state.currentState = "welcome";
    if (!session.capabilities?.speaker?.isPrivate) {
      session.logger.warn("Audio may route through phone (no private speaker).");
    }
    await this.queueTTS(session, sessionId, "Rescue CPR app ready. Say anything to begin.");
  }
  private async enterSafetyCheck(session: AppSession, sessionId: string) {
    const c = this.ctx(sessionId);
    c.state.currentState = "safety_check";
    await this.queueTTS(
      session,
      sessionId,
      "Ensure the scene is safe: traffic, fire, and electrical hazards. Tell me if it's safe or not."
    );
  }
  private async enterResponsiveness(session: AppSession, sessionId: string) {
    const c = this.ctx(sessionId);
    c.state.currentState = "responsiveness_check";
    await this.queueTTS(
      session,
      sessionId,
      "Tap the person's shoulder and shout 'Are you okay?' Tell me if they responded or not."
    );
  }
  private async enterCompressions(session: AppSession, sessionId: string) {
    const c = this.ctx(sessionId);
    c.state.currentState = "compressions";
    c.state.speechGuardUntil = Date.now() + 2200;
    await session.audio.speak(
      `Starting compressions at ${c.state.metronomeBPM} beats per minute. You can say things like “check my hands”, “go faster”, or “open settings”.`
    );
    setTimeout(() => this.startMetronome(session, sessionId), 450);
  }
  private async enterSettings(session: AppSession, sessionId: string) {
    const c = this.ctx(sessionId);
    c.state.currentState = "settings";
    const saveTxt = c.state.saveForQA ? "enabled" : "disabled";
    await this.queueTTS(session, sessionId, `Settings. Photo saving is ${saveTxt}. Say “back to compressions”.`);
  }

  private async changeBPM(session: AppSession, sessionId: string) {
    const c = this.ctx(sessionId);
    const options: BPM[] = [100, 110, 120];
    const idx = options.indexOf(c.state.metronomeBPM);
    c.state.metronomeBPM = options[(idx + 1) % options.length];

    this.stopMetronome(sessionId);
    await this.stopAllAudio(session);
    this.startMetronome(session, sessionId);
    await session.audio.speak(`Metronome changed to ${c.state.metronomeBPM} beats per minute.`);
  }

  // Router
  private installTranscriptionRouter(session: AppSession, sessionId: string) {
    const unsub = session.events.onTranscription(async (data: any) => {
      if (!isFinal(data?.isFinal)) return;
      const text = data?.text || "";
      const c = this.ctx(sessionId);

      session.logger.info(`ASR final: "${text}" (state=${c.state.currentState})`);
      const nlu = await classifyIntent(text, c.state.currentState);
      session.logger.info(`NLU intent: ${nlu.intent}`);

      // Globals
      if (nlu.intent === "START") {
        await this.stopAllAudio(session);
        this.stopMetronome(sessionId);
        c.state = { ...initialState(), metronomeBPM: c.state.metronomeBPM, saveForQA: c.state.saveForQA };
        await this.enterSafetyCheck(session, sessionId);
        return;
      }
      if (nlu.intent === "EMERGENCY_CALLED") {
        c.state.emergencyConfirmed = true;
        await this.queueTTS(session, sessionId, "Emergency services called. Now check if the person is responsive.");
        setTimeout(() => this.enterResponsiveness(session, sessionId), 1000);
        return;
      }
      if (nlu.intent === "CHECK_HANDS") {
        if (c.state.currentState !== "compressions") {
          await this.queueTTS(session, sessionId, "Starting compressions, then I’ll check hand position.");
          await this.enterCompressions(session, sessionId);
          setTimeout(() => this.captureHandsPhoto(session, sessionId), 300);
        } else {
          await this.captureHandsPhoto(session, sessionId);
        }
        return;
      }

      // State-specific
      switch (c.state.currentState) {
        case "welcome": {
          // Any utterance after welcome moves to safety check
          await this.enterSafetyCheck(session, sessionId);
          break;
        }
        case "safety_check": {
          if (nlu.intent === "CONFIRM_SAFETY") {
            await this.queueTTS(session, sessionId, "Scene is safe. Proceeding to check responsiveness.");
            setTimeout(() => this.enterResponsiveness(session, sessionId), 800);
          } else if (nlu.intent === "HAZARD_PRESENT") {
            await this.queueTTS(
              session,
              sessionId,
              "Emergency! Call 911 immediately. Tell me when emergency is called."
            );
          } else {
            await this.queueTTS(session, sessionId, "Is the scene safe or not?");
          }
          break;
        }
        case "responsiveness_check": {
          if (nlu.intent === "RESPONSIVE_YES") {
            await this.queueTTS(session, sessionId, "Good. Monitor them and call for help if needed.");
            await this.enterSafetyCheck(session, sessionId);
          } else if (nlu.intent === "RESPONSIVE_NO") {
            await this.queueTTS(session, sessionId, "No response detected. Starting CPR compressions now.");
            setTimeout(() => this.enterCompressions(session, sessionId), 800);
          } else {
            await this.queueTTS(session, sessionId, "Did they respond or not?");
          }
          break;
        }
        case "compressions": {
          if (nlu.intent === "CHANGE_BPM") {
            await this.changeBPM(session, sessionId);
          } else if (nlu.intent === "OPEN_SETTINGS") {
            await this.enterSettings(session, sessionId);
          } else {
            // keep compressions
          }
          break;
        }
        case "settings": {
          if (nlu.intent === "BACK_TO_COMPRESSIONS") {
            await this.enterCompressions(session, sessionId);
          } else {
            await this.queueTTS(session, sessionId, "Say “back to compressions”.");
          }
          break;
        }
      }
    });
    this.addSub(sessionId, unsub);
  }

  // Lifecycle
  protected async onSession(session: AppSession, sessionId: string, userId: string): Promise<void> {
    this.ctxMap.set(sessionId, {
      state: initialState(),
      unsubscribes: [],
      ttsQueue: [],
      ttsPlaying: false,
    });

    const caps = `camera=${String(session.capabilities?.hasCamera)} privateSpeaker=${String(
      session.capabilities?.speaker?.isPrivate
    )}`;
    session.logger.info(`Capabilities: ${caps}`);

    // Optional settings wire-up
    try {
      const ctx = this.ctx(sessionId);
      const bpm = session.settings.get<number>(SETTING_METRONOME_BPM, 110);
      const save = session.settings.get<boolean>(SETTING_SAVE_FOR_QA, true);
      ctx.state.metronomeBPM = (bpm === 100 || bpm === 110 || bpm === 120 ? bpm : 110) as BPM;
      ctx.state.saveForQA = !!save;

      const unsubBpm = session.events.onSettingChange<number>(SETTING_METRONOME_BPM, (val) => {
        if (val === 100 || val === 110 || val === 120) {
          ctx.state.metronomeBPM = val as BPM;
          if (ctx.state.currentState === "compressions") {
            this.stopMetronome(sessionId);
            this.startMetronome(session, sessionId);
            this.queueTTS(session, sessionId, `BPM changed to ${val}.`);
          }
        }
      });
      const unsubSave = session.events.onSettingChange<boolean>(SETTING_SAVE_FOR_QA, (val) => {
        ctx.state.saveForQA = !!val;
        this.queueTTS(session, sessionId, `Photo saving ${ctx.state.saveForQA ? "enabled" : "disabled"}.`);
      });
      this.addSub(sessionId, unsubBpm);
      this.addSub(sessionId, unsubSave);
    } catch {
      session.logger.warn("Settings manager not available or misconfigured.");
    }

    // Router + welcome
    this.installTranscriptionRouter(session, sessionId);
    await this.enterWelcome(session, sessionId);

    // Clean-up on disconnect
    const unsubDisc = session.events.onDisconnected(async (reason) => {
      session.logger.info(`Session ${sessionId} disconnected: ${reason}`);
      await this.stopAllAudio(session);
      this.stopMetronome(sessionId);
      this.ctx(sessionId).unsubscribes.forEach((u) => {
        try { u(); } catch {}
      });
      this.ctxMap.delete(sessionId);
    });
    this.addSub(sessionId, unsubDisc);
  }

  protected async onStop(sessionId: string): Promise<void> {
    const c = this.ctxMap.get(sessionId);
    if (c) {
      c.unsubscribes.forEach((u) => { try { u(); } catch {} });
      this.stopMetronome(sessionId);
      this.ctxMap.delete(sessionId);
    }
  }
}

new RescueApp().start().catch((err) => {
  console.error("Failed to start app:", err);
});
