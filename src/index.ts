import { AppServer, AppSession, ViewType } from "@mentra/sdk";
import * as fs from "fs";
import * as path from "path";

// ---------- App constants ----------
const PACKAGE_NAME = process.env.PACKAGE_NAME || "org.movenanter.rsc";
const PORT = parseInt(process.env.PORT || "3000", 10);
const MENTRAOS_API_KEY = process.env.MENTRAOS_API_KEY;
if (!MENTRAOS_API_KEY) {
  console.error("MENTRAOS_API_KEY environment variable is required");
  process.exit(1);
}

// Wake phrases (kept for future use if you want intent words centralized)
const WAKE_PHRASE = "start rescue";
const EMERGENCY_CONFIRMED_PHRASE = "emergency called";
const SAFETY_OK_PHRASE = "yes good";
const SAFETY_NOT_OK_PHRASE = "not good";
const RESPONSIVE_YES_PHRASE = "yes responding";
const RESPONSIVE_NO_PHRASE = "no response";

type HandPlacement = "good" | "high" | "low" | "left" | "right" | "uncertain";
type AppState = "welcome" | "safety_check" | "responsiveness_check" | "compressions" | "settings";

interface HandPlacementResult {
  position: HandPlacement;
  confidence: number; // 0..1
}

// Settings keys (Mentra Developer Console -> App Settings)
const SETTING_SAVE_FOR_QA = "save_for_qa"; // boolean
const SETTING_METRONOME_BPM = "metronome_bpm"; // select: 100 | 110 | 120

// ---------- Local photo storage ----------
class LocalPhotoStorage {
  private photosDir: string;

  constructor() {
    this.photosDir = path.join(process.cwd(), "hands-position");
    if (!fs.existsSync(this.photosDir)) {
      fs.mkdirSync(this.photosDir, { recursive: true });
      console.log(`Created photos directory: ${this.photosDir}`);
    }
  }

  async savePhotoBuffer(buffer: Buffer): Promise<{ success: boolean; filePath?: string }> {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const filePath = path.join(this.photosDir, `hand-position-${timestamp}.jpg`);
      fs.writeFileSync(filePath, buffer);
      console.log(`Photo saved locally: ${filePath}`);
      return { success: true, filePath };
    } catch (error) {
      console.error("Failed to save photo locally:", error);
      return { success: false };
    }
  }

  // Mock analysis
  async analyzeHandPlacement(_: Buffer): Promise<HandPlacementResult> {
    await new Promise((r) => setTimeout(r, 300));
    const positions: HandPlacement[] = ["good", "high", "low", "left", "right", "uncertain"];
    const position = positions[Math.floor(Math.random() * positions.length)];
    const confidence = Math.round((Math.random() * 0.4 + 0.6) * 100) / 100;
    return { position, confidence };
  }
}

// ---------- Per-session context ----------
interface RescueSessionState {
  currentState: AppState;
  emergencyConfirmed: boolean;
  compressionCount: number;
  sessionStartTime: number;
  lastHandCheckTime: number;

  // Mentra settings
  metronomeBPM: 100 | 110 | 120;
  saveForQA: boolean;

  // Audio helpers
  speechGuardUntil?: number;            // while Date.now() < this, skip ticks
  metronomeInterval?: NodeJS.Timeout;   // active metronome timer
}

interface SessionContext {
  state: RescueSessionState;
  unsubscribes: Array<() => void>;
  ttsQueue: string[];
  ttsPlaying: boolean;

  // camera serialization
  cameraBusy?: boolean;
}

function createInitialState(): RescueSessionState {
  return {
    currentState: "welcome",
    emergencyConfirmed: false,
    compressionCount: 0,
    sessionStartTime: Date.now(),
    lastHandCheckTime: 0,
    metronomeBPM: 110,
    saveForQA: false,
  };
}

function normalize(text: string) {
  return text.toLowerCase().trim();
}

const photoStorage = new LocalPhotoStorage();

export class Rescue extends AppServer {
  private contexts = new Map<string, SessionContext>();

  constructor() {
    super({
      packageName: PACKAGE_NAME,
      apiKey: MENTRAOS_API_KEY!,
      port: PORT,
    });
  }

  // ---------- Helpers ----------
  private ctx(sessionId: string): SessionContext {
    const ctx = this.contexts.get(sessionId);
    if (!ctx) throw new Error("No session context");
    return ctx;
  }

  private addSub(sessionId: string, unsub: () => void) {
    this.ctx(sessionId).unsubscribes.push(unsub);
    this.addCleanupHandler(unsub);
  }

  private async queueTTS(session: AppSession, sessionId: string, message: string) {
    const ctx = this.ctx(sessionId);
    ctx.ttsQueue.push(message);
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
      // Guard: estimate ~2.2s of speech time for short lines
      ctx.state.speechGuardUntil = Date.now() + 2200;

      const res = await session.audio.speak(msg, { voice_settings: { speed: 1 } });
      if (!res.success) session.logger.error("Failed to speak message");
    } catch (e) {
      session.logger.error("Audio error: " + String(e));
    }
    setTimeout(() => this.playNextTTS(session, sessionId), 300);
  }

  private async stopAllAudio(session: AppSession) {
    try {
      await session.audio.stopAudio();
    } catch (e) {
      session.logger.error("stopAudio error: " + String(e));
    }
  }

  private setDashboardStatus(session: AppSession, text: string) {
    if (session.capabilities?.hasDisplay) {
      session.dashboard.content.writeToMain(`Rescue: ${text}`);
    }
  }

  private showOverlay(session: AppSession, text: string, ms = 3500) {
    if (session.capabilities?.hasDisplay) {
      session.layouts.showTextWall(text, { view: ViewType.MAIN, durationMs: ms });
    }
  }

  // ---------- Metronome ----------
  private startMetronome(session: AppSession, sessionId: string) {
    const ctx = this.ctx(sessionId);
    const intervalMs = Math.round(60000 / ctx.state.metronomeBPM);

    this.stopMetronome(sessionId); // clear any previous timer first
    session.logger.info(`Starting metronome @ ${ctx.state.metronomeBPM} BPM`);

    ctx.state.metronomeInterval = setInterval(async () => {
      // Skip ticks if TTS is currently speaking
      if (ctx.state.speechGuardUntil && Date.now() < ctx.state.speechGuardUntil) return;

      ctx.state.compressionCount += 1;

      try {
        const result = await session.audio.playAudio({
          audioUrl: "https://cdn.pixabay.com/audio/2022/03/15/audio_b7a6b7dfc2.mp3", // tick sound
          volume: 0.5, // 0.0–1.0
        });
        if (!result.success && result.error) {
          session.logger.error(`Metronome play error: ${result.error}`);
        }
      } catch (e) {
        session.logger.error("Metronome exception: " + String(e));
      }

      // Every 10 compressions: speak the count
      if (ctx.state.compressionCount % 10 === 0) {
        ctx.state.speechGuardUntil = Date.now() + 1200; // avoid immediate overlap
        this.queueTTS(session, sessionId, String(ctx.state.compressionCount));
        this.setDashboardStatus(session, `${ctx.state.compressionCount} @ ${ctx.state.metronomeBPM} BPM`);
      }

      // About every 2 minutes at ~110 BPM: reassess reminder
      if (ctx.state.compressionCount % 220 === 0) {
        ctx.state.speechGuardUntil = Date.now() + 2200;
        this.queueTTS(session, sessionId, "Two minutes completed. Consider reassessing or swapping rescuers.");
      }
    }, intervalMs);
  }

  private stopMetronome(sessionId: string) {
    const ctx = this.ctx(sessionId);
    if (ctx.state.metronomeInterval) {
      clearInterval(ctx.state.metronomeInterval);
      ctx.state.metronomeInterval = undefined;
    }
  }

  // ---------- Camera (per docs: only `size` is supported) ----------
  private async ensureCameraPermission(session: AppSession) {
    try {
      // Optional: safe no-op if ensure() is not exposed
      // @ts-ignore
      if (session.permissions?.ensure) {
        // @ts-ignore
        await session.permissions.ensure("CAMERA");
      }
    } catch (e) {
      session.logger.warn("CAMERA permission ensure failed (may not be required on this device): " + String(e));
    }
  }

  // ---------- Flow handlers ----------
  private async enterWelcome(session: AppSession, sessionId: string) {
    const ctx = this.ctx(sessionId);
    ctx.state.currentState = "welcome";

    if (!session.capabilities?.speaker?.isPrivate) {
      session.logger.warn("Audio may route through phone (no private speaker).");
    }
    this.showOverlay(session, "Rescue ready. Say “start rescue”.");
    await this.queueTTS(session, sessionId, "Rescue CPR app ready. Say 'start rescue' to begin.");

    const unsubVad = session.events.onVoiceActivity((_data) => { /* no-op */ });
    this.addSub(sessionId, unsubVad);
  }

  private async enterSafetyCheck(session: AppSession, sessionId: string) {
    const ctx = this.ctx(sessionId);
    ctx.state.currentState = "safety_check";
    this.showOverlay(session, "Check scene safety. Say “yes good” or “not good”.", 6000);
    await this.queueTTS(
      session,
      sessionId,
      "Ensure the scene is safe: traffic, fire, electrical hazards. Say 'yes good' if safe, or 'not good' if hazards."
    );
  }

  private async enterEmergencyCallWait(session: AppSession, sessionId: string) {
    const ctx = this.ctx(sessionId);
    ctx.state.emergencyConfirmed = false;
    await this.queueTTS(
      session,
      sessionId,
      "Emergency! Call 911 immediately. Say 'emergency called' when you have called for help."
    );
    this.showOverlay(session, "Call emergency. Then say “emergency called”.", 6000);

    setTimeout(() => {
      if (!this.ctx(sessionId).state.emergencyConfirmed) {
        this.queueTTS(session, sessionId, "Please confirm you have called emergency services by saying 'emergency called'.");
      }
    }, 10000);
  }

  private async enterResponsivenessCheck(session: AppSession, sessionId: string) {
    const ctx = this.ctx(sessionId);
    ctx.state.currentState = "responsiveness_check";
    this.showOverlay(session, "Tap + shout: “Are you okay?” Then say “yes responding” or “no response”.", 7000);
    await this.queueTTS(
      session,
      sessionId,
      "Tap the person's shoulder and shout 'Are you okay?' Say 'yes responding' if they responded, or 'no response' if not."
    );
  }

  private async enterCompressions(session: AppSession, sessionId: string) {
    const ctx = this.ctx(sessionId);
    ctx.state.currentState = "compressions";

    // Speak first, then start metronome
    ctx.state.speechGuardUntil = Date.now() + 2400; // protect initial line
    await session.audio.speak(
      `Starting compressions at ${ctx.state.metronomeBPM} beats per minute. Say 'check hands', 'change speed', or 'settings'.`,
      { voice_settings: { speed: 1 } }
    );

    setTimeout(() => this.startMetronome(session, sessionId), 400);

    this.showOverlay(
      session,
      `Compressions @ ${ctx.state.metronomeBPM} BPM\nSay "check hands", "change speed", or "settings"`
    );
  }

  private async enterSettings(session: AppSession, sessionId: string) {
    const ctx = this.ctx(sessionId);
    ctx.state.currentState = "settings";
    const saveTxt = ctx.state.saveForQA ? "enabled" : "disabled";
    await this.queueTTS(
      session,
      sessionId,
      `Settings. Photo saving is ${saveTxt}. Say 'toggle photos' to change, or 'back to compressions' to return.`
    );
    this.showOverlay(session, `Settings\nPhoto saving: ${saveTxt}\nSay “toggle photos” or “back to compressions”`);
  }

  // ---------- Intent router ----------
  private installTranscriptionRouter(session: AppSession, sessionId: string) {
    const unsub = session.events.onTranscription(async (data) => {
      const text = normalize(data.text);
      if (!data.isFinal) return;

      const ctx = this.ctx(sessionId);

      // Global restart
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
            await this.enterEmergencyCallWait(session, sessionId);
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
          if (text.includes("check") && text.includes("hands")) {
            await this.captureAndAnalyzeHands(session, sessionId);
          } else if (text.includes("change") && text.includes("speed")) {
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

      // handle emergency confirmation anytime
      if (text.includes("emergency") && text.includes("called")) {
        ctx.state.emergencyConfirmed = true;
        await this.queueTTS(session, sessionId, "Emergency services called. Now check if the person is responsive.");
        setTimeout(() => this.enterResponsivenessCheck(session, sessionId), 1500);
      }
    });

    this.addSub(sessionId, unsub);
  }

  // ---------- Camera & analysis (docs-compliant) ----------
  private getGuidanceMessage(result: HandPlacementResult) {
    const m: Record<HandPlacement, string> = {
      good: "Centered, keep going.",
      high: "Hands slightly high, move lower.",
      low: "Hands slightly low, move higher.",
      left: "Hands slightly left, move right.",
      right: "Hands slightly right, move left.",
      uncertain: "Hand position unclear, continue and try again."
    };
    return m[result.position];
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
      await this.ensureCameraPermission(session);

      // Brief guard then announce
      ctx.state.speechGuardUntil = Date.now() + 1000;
      await session.audio.speak("Capturing photo to check hand position.");

      // Per docs: only `size` is supported. Try small → fallback to default.
      let photo = await session.camera.requestPhoto({ size: "medium" });
      if (!photo?.buffer) {
        session.logger.warn("requestPhoto({size:'medium'}) returned no buffer; retrying with default.");
        photo = await session.camera.requestPhoto();
      }

      if (!photo?.buffer) throw new Error("NO_PHOTO_BUFFER");

      ctx.state.lastHandCheckTime = Date.now();
      session.logger.info(
        `Photo captured: ${photo.filename ?? "(no name)"}; bytes=${photo.size}; type=${photo.mimeType}`
      );

      const result = await photoStorage.analyzeHandPlacement(photo.buffer as Buffer);
      const guidance = this.getGuidanceMessage(result);

      await session.audio.speak(guidance);
      this.showOverlay(session, `Hands: ${result.position} (${Math.round(result.confidence * 100)}%)`);

      if (ctx.state.saveForQA) {
        const saved = await photoStorage.savePhotoBuffer(photo.buffer as Buffer);
        if (!saved.success) session.logger.error("Failed to save photo locally");
      }
    } catch (e: any) {
      session.logger.error("Photo capture/analysis failed:", e);
      await session.audio.speak("Unable to check hand position right now. Continue compressions and try again.");
    } finally {
      ctx.cameraBusy = false;
    }
  }

  // ---------- Settings / BPM ----------
  private async cycleBPM(session: AppSession, sessionId: string) {
    const ctx = this.ctx(sessionId);
    const options: Array<100 | 110 | 120> = [100, 110, 120];
    const idx = options.indexOf(ctx.state.metronomeBPM);
    ctx.state.metronomeBPM = options[(idx + 1) % options.length];

    this.stopMetronome(sessionId);
    await this.stopAllAudio(session);
    this.startMetronome(session, sessionId);

    await session.audio.speak(`Metronome changed to ${ctx.state.metronomeBPM} beats per minute.`);
    this.showOverlay(session, `BPM: ${ctx.state.metronomeBPM}`);
  }

  // ---------- Lifecycle ----------
  protected async onSession(session: AppSession, sessionId: string, userId: string): Promise<void> {
    session.logger.info(`Rescue CPR session started: ${sessionId} for user ${userId}`);

    this.contexts.set(sessionId, {
      state: createInitialState(),
      unsubscribes: [],
      ttsQueue: [],
      ttsPlaying: false,
    });

    // Capability preflight
    session.logger.info(
      `Capabilities: camera=${String(session.capabilities?.hasCamera)} speakerPrivate=${String(session.capabilities?.speaker?.isPrivate)}`
    );

    // Adopt Mentra settings
    try {
      const bpm = session.settings.get<number>(SETTING_METRONOME_BPM, 110);
      const save = session.settings.get<boolean>(SETTING_SAVE_FOR_QA, false);
      const ctx = this.ctx(sessionId);
      ctx.state.metronomeBPM = (bpm === 100 || bpm === 110 || bpm === 120 ? bpm : 110) as 100 | 110 | 120;
      ctx.state.saveForQA = Boolean(save);

      const unsubBpm = session.events.onSettingChange<number>(SETTING_METRONOME_BPM, (val) => {
        if (val === 100 || val === 110 || val === 120) {
          ctx.state.metronomeBPM = val;
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
    } catch (e) {
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

    // Enter welcome
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
new Rescue().start().catch((err) => {
  console.error("Failed to start Rescue app:", err);
});
