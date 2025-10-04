import { AppServer, AppSession } from "@mentra/sdk";
import * as fs from "fs";
import * as path from "path";

// ---------------- App constants ----------------
const PACKAGE_NAME = process.env.PACKAGE_NAME || "org.movenanter.rescue";
const PORT = Number(process.env.PORT || 3000);
const MENTRAOS_API_KEY = process.env.MENTRAOS_API_KEY;
if (!MENTRAOS_API_KEY) {
  console.error("MENTRAOS_API_KEY environment variable is required");
  process.exit(1);
}

// ---------------- Types ----------------
type BPM = 100 | 110 | 120;
type AppState = "welcome" | "safety_check" | "responsiveness_check" | "compressions" | "settings";
type HandPlacement = "good" | "high" | "low" | "left" | "right" | "uncertain";

interface HandPlacementResult {
  position: HandPlacement;
  confidence: number; // 0..1
}

interface RescueSessionState {
  currentState: AppState;
  compressionCount: number;
  emergencyConfirmed: boolean;
  sessionStartTime: number;
  lastHandCheckTime: number;

  metronomeBPM: BPM;
  saveForQA: boolean;

  // runtime helpers
  speechGuardUntil?: number;          // while Date.now() < this, pause ticks
  metronomeTimer?: NodeJS.Timeout;    // interval id
}

interface SessionContext {
  state: RescueSessionState;
  unsubscribes: Array<() => void>;
  ttsQueue: string[];
  ttsPlaying: boolean;
  cameraBusy?: boolean;
}

// Settings keys (add these in Developer Console if you want)
const SETTING_SAVE_FOR_QA = "save_for_qa";     // boolean
const SETTING_METRONOME_BPM = "metronome_bpm"; // 100 | 110 | 120

// ---------------- Utilities ----------------
const RE_TRUE = /^(true|1|yes)$/i;
const RE_CHECK_HANDS =
  /\b(check|scan|verify|assess|inspect|review)\b.*\bhand(s)?\b|\bhand(s)?\b.*\b(check|scan|verify|assess|inspect|review)\b|hand\s*check|check\s*position|hand\s*position/;

function isFinalFlag(v: unknown): boolean {
  return v === true || (typeof v === "string" && RE_TRUE.test(v));
}
function normalize(s: string) {
  return (s || "").toLowerCase().trim();
}
function createInitialState(): RescueSessionState {
  return {
    currentState: "welcome",
    compressionCount: 0,
    emergencyConfirmed: false,
    sessionStartTime: Date.now(),
    lastHandCheckTime: 0,
    metronomeBPM: 110,
    saveForQA: false,
  };
}

// ---------------- Mock hand analyzer & local storage ----------------
class LocalPhotoStorage {
  private dir: string;
  constructor() {
    this.dir = path.join(process.cwd(), "hands-position");
    if (!fs.existsSync(this.dir)) fs.mkdirSync(this.dir, { recursive: true });
  }
  async save(buffer: Buffer): Promise<{ success: boolean; filePath?: string }> {
    try {
      const ts = new Date().toISOString().replace(/[:.]/g, "-");
      const filePath = path.join(this.dir, `hand-position-${ts}.jpg`);
      fs.writeFileSync(filePath, buffer);
      return { success: true, filePath };
    } catch {
      return { success: false };
    }
  }
  async analyze(_: Buffer): Promise<HandPlacementResult> {
    await new Promise((r) => setTimeout(r, 300));
    const pick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];
    const position = pick<HandPlacement>(["good", "high", "low", "left", "right", "uncertain"]);
    const confidence = Math.round((Math.random() * 0.4 + 0.6) * 100) / 100;
    return { position, confidence };
  }
}
const photoStorage = new LocalPhotoStorage();

// ---------------- App ----------------
class RescueApp extends AppServer {
  private contexts = new Map<string, SessionContext>();

  constructor() {
    super({
      packageName: PACKAGE_NAME,
      apiKey: MENTRAOS_API_KEY!,
      port: PORT,
    });
  }

  // ---- context helpers
  private ctx(sessionId: string) {
    const ctx = this.contexts.get(sessionId);
    if (!ctx) throw new Error("No session context");
    return ctx;
  }
  private addSub(sessionId: string, unsub: () => void) {
    this.ctx(sessionId).unsubscribes.push(unsub);
    this.addCleanupHandler(unsub);
  }

  // ---- TTS queue so lines never collide
  private async queueTTS(session: AppSession, sessionId: string, msg: string) {
    const ctx = this.ctx(sessionId);
    ctx.ttsQueue.push(msg);
    if (!ctx.ttsPlaying) await this.playNextTTS(session, sessionId);
  }
  private async playNextTTS(session: AppSession, sessionId: string): Promise<void> {
    const ctx = this.ctx(sessionId);
    if (ctx.ttsQueue.length === 0) {
      ctx.ttsPlaying = false;
      return;
    }
    ctx.ttsPlaying = true;
    const msg = ctx.ttsQueue.shift()!;
    try {
      // Guard ticks for ~2.2s while we speak short lines
      ctx.state.speechGuardUntil = Date.now() + 2200;
      const res = await session.audio.speak(msg, { voice_settings: { speed: 1 } });
      if (!res.success) session.logger.error("TTS failed");
    } catch (e) {
      session.logger.error("TTS exception: " + String(e));
    }
    setTimeout(() => this.playNextTTS(session, sessionId), 300);
  }
  private async stopAllAudio(session: AppSession) {
    try { await session.audio.stopAudio(); } catch {}
  }

  // ---- Metronome via audioUrl (audio-only)
  private startMetronome(session: AppSession, sessionId: string) {
    const ctx = this.ctx(sessionId);
    const period = Math.round(60000 / ctx.state.metronomeBPM);

    this.stopMetronome(sessionId);
    session.logger.info(`Metronome start @ ${ctx.state.metronomeBPM} BPM`);

    ctx.state.metronomeTimer = setInterval(async () => {
      if (ctx.state.speechGuardUntil && Date.now() < ctx.state.speechGuardUntil) return;

      ctx.state.compressionCount++;

      try {
        const result = await session.audio.playAudio({
          // Short public tick
          audioUrl: "https://cdn.pixabay.com/audio/2022/03/15/audio_b7a6b7dfc2.mp3",
          volume: 0.5, // 0.0–1.0
        });
        if (!result.success && result.error) session.logger.error(`Tick error: ${result.error}`);
      } catch (e) {
        session.logger.error("Tick exception: " + String(e));
      }

      if (ctx.state.compressionCount % 10 === 0) {
        ctx.state.speechGuardUntil = Date.now() + 1100;
        this.queueTTS(session, sessionId, String(ctx.state.compressionCount));
      }
      if (ctx.state.compressionCount % 220 === 0) {
        ctx.state.speechGuardUntil = Date.now() + 2200;
        this.queueTTS(session, sessionId, "Two minutes completed. Consider reassessing or swapping rescuers.");
      }
    }, period);
  }
  private stopMetronome(sessionId: string) {
    const ctx = this.ctx(sessionId);
    if (ctx.state.metronomeTimer) {
      clearInterval(ctx.state.metronomeTimer);
      ctx.state.metronomeTimer = undefined;
    }
  }

  // ---- Camera helpers (per docs)
  private guidanceText(result: HandPlacementResult) {
    const map: Record<HandPlacement, string> = {
      good: "Centered, keep going.",
      high: "Hands slightly high, move lower.",
      low: "Hands slightly low, move higher.",
      left: "Hands slightly left, move right.",
      right: "Hands slightly right, move left.",
      uncertain: "Hand position unclear, continue and try again.",
    };
    return map[result.position];
  }

  private async captureAndAnalyzeHands(session: AppSession, sessionId: string) {
    const ctx = this.ctx(sessionId);

    if (!session.capabilities?.hasCamera) {
      await this.queueTTS(session, sessionId, "This device has no camera. Continue compressions.");
      return;
    }
    if (ctx.cameraBusy) {
      await this.queueTTS(session, sessionId, "Still processing the last photo. Try again in a moment.");
      return;
    }

    ctx.cameraBusy = true;
    try {
      // Optional: ensure CAMERA permission if your build uses permissions manager
      // @ts-ignore
      if (session.permissions?.ensure) {
        // @ts-ignore
        await session.permissions.ensure("CAMERA");
      }

      ctx.state.speechGuardUntil = Date.now() + 900;
      await session.audio.speak("Capturing photo to check hand position.");

      // Per docs: requestPhoto({ size }) returns PhotoData with buffer + metadata
      let photo = await session.camera.requestPhoto({ size: "small" }); // faster
      if (!photo?.buffer) {
        // brief backoff → default (medium)
        await new Promise((r) => setTimeout(r, 350));
        photo = await session.camera.requestPhoto();
      }
      if (!photo?.buffer) throw new Error("NO_PHOTO_BUFFER");

      ctx.state.lastHandCheckTime = Date.now();
      session.logger.info(
        `Photo OK: ${photo.filename} ${photo.mimeType} ${photo.size}B (id=${photo.requestId})`
      );

      const result = await photoStorage.analyze(photo.buffer as Buffer);
      const guidance = this.guidanceText(result);

      await session.audio.speak(guidance);

      if (ctx.state.saveForQA) {
        const saved = await photoStorage.save(photo.buffer as Buffer);
        if (!saved.success) session.logger.error("Save photo failed");
      }
    } catch (e: any) {
      const code = e?.code || e?.name || "UNKNOWN_ERROR";
      const msg = e?.message || String(e);
      session.logger.error(`Photo failed: code=${code} msg=${msg}`);
      await session.audio.speak("Unable to check hand position right now. Continue compressions and try again.");
    } finally {
      ctx.cameraBusy = false;
    }
  }

  // ---- Flow
  private async enterWelcome(session: AppSession, sessionId: string) {
    const ctx = this.ctx(sessionId);
    ctx.state.currentState = "welcome";

    if (!session.capabilities?.speaker?.isPrivate) {
      session.logger.warn("Audio may route through phone (no private speaker).");
    }
    await this.queueTTS(session, sessionId, "Rescue CPR app ready. Say 'start rescue' to begin.");
  }

  private async enterSafetyCheck(session: AppSession, sessionId: string) {
    const ctx = this.ctx(sessionId);
    ctx.state.currentState = "safety_check";
    await this.queueTTS(
      session,
      sessionId,
      "Ensure the scene is safe: traffic, fire, and electrical hazards. Say 'yes good' if safe, or 'not good' if hazards."
    );
  }

  private async enterEmergencyWait(session: AppSession, sessionId: string) {
    const ctx = this.ctx(sessionId);
    ctx.state.emergencyConfirmed = false;
    await this.queueTTS(
      session,
      sessionId,
      "Emergency! Call 911 now. Say 'emergency called' when you have called for help."
    );

    setTimeout(() => {
      const s = this.ctx(sessionId).state;
      if (!s.emergencyConfirmed) {
        this.queueTTS(session, sessionId, "Please confirm you have called emergency services.");
      }
    }, 10000);
  }

  private async enterResponsivenessCheck(session: AppSession, sessionId: string) {
    const ctx = this.ctx(sessionId);
    ctx.state.currentState = "responsiveness_check";
    await this.queueTTS(
      session,
      sessionId,
      "Tap the person's shoulder and shout 'Are you okay?' Say 'yes responding' if they responded, or 'no response' if not."
    );
  }

  private async enterCompressions(session: AppSession, sessionId: string) {
    const ctx = this.ctx(sessionId);
    ctx.state.currentState = "compressions";

    // Speak first, then tick—so the first beat is audible
    ctx.state.speechGuardUntil = Date.now() + 2200;
    await session.audio.speak(
      `Starting compressions at ${ctx.state.metronomeBPM} beats per minute. Say 'check hands', 'change speed', or 'settings'.`
    );
    setTimeout(() => this.startMetronome(session, sessionId), 450);
  }

  private async enterSettings(session: AppSession, sessionId: string) {
    const ctx = this.ctx(sessionId);
    ctx.state.currentState = "settings";
    const saveTxt = ctx.state.saveForQA ? "enabled" : "disabled";
    await this.queueTTS(
      session,
      sessionId,
      `Settings. Photo saving is ${saveTxt}. Say 'toggle photos' or 'back to compressions'.`
    );
  }

  // ---- Transcription router (robust + global “check hands”)
  private installTranscriptionRouter(session: AppSession, sessionId: string) {
    const unsub = session.events.onTranscription(async (data) => {
      const text = normalize(data?.text || "");
      const final = isFinalFlag(data?.isFinal);
      if (!final) return;

      const ctx = this.ctx(sessionId);
      session.logger.info(`ASR: state=${ctx.state.currentState} text="${text}"`);

      // Global: restart flow
      if (text.includes("start") && text.includes("rescue")) {
        await this.stopAllAudio(session);
        this.stopMetronome(sessionId);
        ctx.state = {
          ...createInitialState(),
          metronomeBPM: ctx.state.metronomeBPM,
          saveForQA: ctx.state.saveForQA,
        };
        await this.enterSafetyCheck(session, sessionId);
        return;
      }

      // Global: emergency confirm
      if (text.includes("emergency") && text.includes("called")) {
        ctx.state.emergencyConfirmed = true;
        await this.queueTTS(session, sessionId, "Emergency services called. Now check if the person is responsive.");
        setTimeout(() => this.enterResponsivenessCheck(session, sessionId), 1200);
        return;
      }

      // Global: check hands (works in any state; accepts variants)
      if (RE_CHECK_HANDS.test(text)) {
        if (ctx.state.currentState !== "compressions") {
          await this.queueTTS(session, sessionId, "Starting compressions, then I’ll check hand position.");
          await this.enterCompressions(session, sessionId);
          setTimeout(() => this.captureAndAnalyzeHands(session, sessionId), 300);
        } else {
          await this.captureAndAnalyzeHands(session, sessionId);
        }
        return;
      }

      // State-specific intents
      switch (ctx.state.currentState) {
        case "welcome": {
          if (text.includes("start") && text.includes("rescue")) {
            await this.enterSafetyCheck(session, sessionId);
          }
          break;
        }
        case "safety_check": {
          if (text.includes("yes") && text.includes("good")) {
            await this.queueTTS(session, sessionId, "Scene is safe. Proceeding to check responsiveness.");
            setTimeout(() => this.enterResponsivenessCheck(session, sessionId), 1000);
          } else if (text.includes("not") && text.includes("good")) {
            await this.enterEmergencyWait(session, sessionId);
          }
          break;
        }
        case "responsiveness_check": {
          if (text.includes("yes") && text.includes("responding")) {
            await this.queueTTS(session, sessionId, "Good. Monitor them and call for help if needed.");
            setTimeout(() => this.enterSafetyCheck(session, sessionId), 1500);
          } else if (text.includes("no") && text.includes("response") || text.includes("not responding")) {
            await this.queueTTS(session, sessionId, "No response detected. Starting CPR compressions now.");
            setTimeout(() => this.enterCompressions(session, sessionId), 1200);
          }
          break;
        }
        case "compressions": {
          if (text.includes("change") && text.includes("speed")) {
            await this.cycleBPM(session, sessionId);
          } else if (text.includes("settings")) {
            await this.enterSettings(session, sessionId);
          }
          break;
        }
        case "settings": {
          if (text.includes("toggle") && text.includes("photos")) {
            ctx.state.saveForQA = !ctx.state.saveForQA;
            await session.audio.speak(`Photo saving ${ctx.state.saveForQA ? "enabled" : "disabled"}.`);
            await this.enterSettings(session, sessionId);
          } else if (text.includes("back") && text.includes("compressions")) {
            await this.enterCompressions(session, sessionId);
          }
          break;
        }
      }
    });

    this.addSub(sessionId, unsub);
  }

  // ---- Settings / BPM
  private async cycleBPM(session: AppSession, sessionId: string) {
    const ctx = this.ctx(sessionId);
    const options: BPM[] = [100, 110, 120];
    const idx = options.indexOf(ctx.state.metronomeBPM);
    ctx.state.metronomeBPM = options[(idx + 1) % options.length];

    this.stopMetronome(sessionId);
    await this.stopAllAudio(session);
    this.startMetronome(session, sessionId);
    await session.audio.speak(`Metronome changed to ${ctx.state.metronomeBPM} beats per minute.`);
  }

  // ---- Lifecycle
  protected async onSession(session: AppSession, sessionId: string, userId: string): Promise<void> {
    session.logger.info(`Rescue CPR session started: ${sessionId} for user ${userId}`);

    this.contexts.set(sessionId, {
      state: createInitialState(),
      unsubscribes: [],
      ttsQueue: [],
      ttsPlaying: false,
    });

    // Audio-only capabilities note
    session.logger.info(
      `Capabilities: camera=${String(session.capabilities?.hasCamera)} privateSpeaker=${String(session.capabilities?.speaker?.isPrivate)}`
    );

    // Adopt settings (optional, if configured in console)
    try {
      const bpm = session.settings.get<number>(SETTING_METRONOME_BPM, 110);
      const save = session.settings.get<boolean>(SETTING_SAVE_FOR_QA, false);
      const ctx = this.ctx(sessionId);
      ctx.state.metronomeBPM = (bpm === 100 || bpm === 110 || bpm === 120 ? bpm : 110) as BPM;
      ctx.state.saveForQA = Boolean(save);

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

    // Router
    this.installTranscriptionRouter(session, sessionId);

    // Disconnect cleanup
    const unsubDisc = session.events.onDisconnected(async (reason) => {
      session.logger.info(`Session ${sessionId} disconnected: ${reason}`);
      await this.stopAllAudio(session);
      this.stopMetronome(sessionId);
      this.ctx(sessionId).unsubscribes.forEach((u) => { try { u(); } catch {} });
      this.contexts.delete(sessionId);
    });
    this.addSub(sessionId, unsubDisc);

    // Enter welcome (audio only)
    await this.enterWelcome(session, sessionId);
  }

  protected async onStop(sessionId: string): Promise<void> {
    const ctx = this.contexts.get(sessionId);
    if (ctx) {
      ctx.unsubscribes.forEach((u) => { try { u(); } catch {} });
      this.stopMetronome(sessionId);
      this.contexts.delete(sessionId);
    }
  }
}

// Bootstrap server
new RescueApp().start().catch((err) => {
  console.error("Failed to start Rescue app:", err);
});
