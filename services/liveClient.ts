import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { decodeAudioData, arrayBufferToBase64 } from '../utils';

export class LiveClient {
  private ai: GoogleGenAI;
  private session: any = null;
  private inputAudioContext: AudioContext | null = null;
  private outputAudioContext: AudioContext | null = null;
  private nextStartTime: number = 0;
  private sources: Set<AudioBufferSourceNode> = new Set();
  private stream: MediaStream | null = null;
  private processor: ScriptProcessorNode | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  
  public onTranscriptUpdate: ((text: string, isUser: boolean) => void) | null = null;
  public onConnectionStateChange: ((isConnected: boolean) => void) | null = null;

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  }

  async connect(systemInstruction: string) {
    this.inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
    this.outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    
    // Connect to Live API
    const sessionPromise = this.ai.live.connect({
      model: 'gemini-2.5-flash-native-audio-preview-09-2025',
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } }, // Authoritative voice
        },
        systemInstruction: systemInstruction,
        inputAudioTranscription: {}, // Request transcription to show in UI
        outputAudioTranscription: {}
      },
      callbacks: {
        onopen: () => {
          console.log("Live Session Opened");
          this.onConnectionStateChange?.(true);
          this.startAudioStream(sessionPromise);
        },
        onmessage: async (message: LiveServerMessage) => {
          this.handleMessage(message);
        },
        onclose: () => {
          console.log("Live Session Closed");
          this.onConnectionStateChange?.(false);
          this.cleanup();
        },
        onerror: (err) => {
          console.error("Live Session Error", err);
          this.onConnectionStateChange?.(false);
        }
      }
    });

    this.session = sessionPromise; // Store promise to access session for sending
  }

  private async startAudioStream(sessionPromise: Promise<any>) {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!this.inputAudioContext) return;

      this.sourceNode = this.inputAudioContext.createMediaStreamSource(this.stream);
      this.processor = this.inputAudioContext.createScriptProcessor(4096, 1, 1);

      this.processor.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
        // Convert Float32 to PCM 16-bit
        const pcmData = this.float32ToInt16(inputData);
        const base64Data = arrayBufferToBase64(pcmData);

        sessionPromise.then(session => {
             session.sendRealtimeInput({
                media: {
                    mimeType: 'audio/pcm;rate=16000',
                    data: base64Data
                }
            });
        });
      };

      this.sourceNode.connect(this.processor);
      this.processor.connect(this.inputAudioContext.destination);
    } catch (err) {
      console.error("Error accessing microphone:", err);
    }
  }

  private async handleMessage(message: LiveServerMessage) {
    // Handle Audio Output
    const audioData = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
    if (audioData && this.outputAudioContext) {
      const rawBytes = Uint8Array.from(atob(audioData), c => c.charCodeAt(0));
      const audioBuffer = await decodeAudioData(rawBytes, this.outputAudioContext, 24000, 1);
      
      this.playAudio(audioBuffer);
    }

    // Handle Transcriptions
    if (message.serverContent?.outputTranscription?.text) {
        this.onTranscriptUpdate?.(message.serverContent.outputTranscription.text, false);
    }
    if (message.serverContent?.inputTranscription?.text) {
        this.onTranscriptUpdate?.(message.serverContent.inputTranscription.text, true);
    }

    // Handle Interruption
    if (message.serverContent?.interrupted) {
        this.stopAudioPlayback();
    }
  }

  private playAudio(buffer: AudioBuffer) {
    if (!this.outputAudioContext) return;

    const source = this.outputAudioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(this.outputAudioContext.destination);
    
    const currentTime = this.outputAudioContext.currentTime;
    // Schedule next chunk
    const startTime = Math.max(this.nextStartTime, currentTime);
    source.start(startTime);
    this.nextStartTime = startTime + buffer.duration;
    
    this.sources.add(source);
    source.onended = () => this.sources.delete(source);
  }

  private stopAudioPlayback() {
    this.sources.forEach(source => {
        try { source.stop(); } catch(e) {}
    });
    this.sources.clear();
    this.nextStartTime = 0;
  }

  public disconnect() {
    this.cleanup();
    if (this.session) {
        this.session.then((s: any) => {
             try { s.close(); } catch(e) {}
        });
    }
    this.session = null;
  }

  private cleanup() {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    if (this.processor && this.sourceNode) {
      this.sourceNode.disconnect();
      this.processor.disconnect();
    }
    if (this.inputAudioContext) {
      this.inputAudioContext.close();
      this.inputAudioContext = null;
    }
    if (this.outputAudioContext) {
        this.outputAudioContext.close();
        this.outputAudioContext = null;
    }
    this.stopAudioPlayback();
  }

  private float32ToInt16(float32: Float32Array): ArrayBuffer {
    const int16 = new Int16Array(float32.length);
    for (let i = 0; i < float32.length; i++) {
        let s = Math.max(-1, Math.min(1, float32[i]));
        int16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    return int16.buffer;
  }
}
