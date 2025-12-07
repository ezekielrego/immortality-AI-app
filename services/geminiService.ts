import { GoogleGenAI, Type, Schema, LiveServerMessage, Modality } from "@google/genai";
import { PersonaProfile } from '../types';
import { createPcmBlob, decodeAudioData, base64ToUint8Array } from '../utils/audioUtils';

const API_KEY = process.env.API_KEY || ''; // Injected by environment
const ai = new GoogleGenAI({ apiKey: API_KEY });

// --- Analysis Service ---

export const analyzeTextContent = async (text: string, currentProfile: PersonaProfile): Promise<Partial<PersonaProfile>> => {
  const model = "gemini-2.5-flash";
  const prompt = `
    You are an expert biographer and psychologist. 
    Analyze the following chat log or text fragment from a person named "${currentProfile.name}".
    
    Extract:
    1. Key personality traits (adjectives).
    2. Specific recurring catchphrases or speech patterns.
    3. Important memories or relationships mentioned.
    4. The general 'voice' or tone (e.g., sarcastic, warm, formal, emoji-heavy).

    Text to Analyze:
    "${text.substring(0, 15000)}" // Limit for safety

    Return JSON matching the schema.
  `;

  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          personalityTraits: { type: Type.ARRAY, items: { type: Type.STRING } },
          keyMemories: { type: Type.ARRAY, items: { type: Type.STRING } },
          voiceStyle: { type: Type.STRING },
          catchphrases: { type: Type.ARRAY, items: { type: Type.STRING } }
        }
      }
    }
  });

  if (response.text) {
    const data = JSON.parse(response.text);
    return {
      personalityTraits: [...currentProfile.personalityTraits, ...(data.personalityTraits || [])],
      keyMemories: [...currentProfile.keyMemories, ...(data.keyMemories || [])],
      voiceStyle: data.voiceStyle || currentProfile.voiceStyle,
    };
  }
  return {};
};

export const analyzeVideoFrames = async (base64Frames: string[], currentProfile: PersonaProfile): Promise<Partial<PersonaProfile>> => {
  const model = "gemini-2.5-flash";
  
  const parts = base64Frames.map(frame => ({
    inlineData: {
      mimeType: 'image/jpeg',
      data: frame
    }
  }));

  parts.push({
    text: `
      These are frames extracted from a video posted by "${currentProfile.name}".
      Analyze the visual context, their body language, the environment, and activity.
      
      Extract:
      1. New personality traits visible here (e.g., adventurous, quiet, chaotic).
      2. Key visual memories or preferences (e.g., loves hiking, plays guitar).
      
      Return JSON.
    `
  } as any); // Type cast for mixed parts

  const response = await ai.models.generateContent({
    model,
    contents: { parts },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          personalityTraits: { type: Type.ARRAY, items: { type: Type.STRING } },
          keyMemories: { type: Type.ARRAY, items: { type: Type.STRING } },
        }
      }
    }
  });

  if (response.text) {
    const data = JSON.parse(response.text);
    return {
      personalityTraits: [...currentProfile.personalityTraits, ...(data.personalityTraits || [])],
      keyMemories: [...currentProfile.keyMemories, ...(data.keyMemories || [])],
    };
  }
  return {};
};

// --- Chat Service ---

export const createChatSession = (profile: PersonaProfile) => {
  const instructions = `
      You are ${profile.name}.
      Your personality traits: ${profile.personalityTraits.join(', ')}.
      Your speaking style: ${profile.voiceStyle}.
      Your memories: ${profile.keyMemories.join('; ')}.
      
      You are talking to a close relative (${profile.relationship}).
      Interact via text message. Use emojis if your style dictates it. Keep messages relatively short like a real chat.
      Do not be an AI. Be the person.
      ${profile.systemInstruction}
  `;

  return ai.chats.create({
    model: 'gemini-2.5-flash',
    config: {
      systemInstruction: instructions,
    }
  });
};

// --- Live Service ---

export class LiveSession {
  private inputAudioContext: AudioContext | null = null;
  private outputAudioContext: AudioContext | null = null;
  private inputNode: GainNode | null = null;
  private outputNode: GainNode | null = null;
  private sessionPromise: Promise<any> | null = null;
  private nextStartTime = 0;
  private sources = new Set<AudioBufferSourceNode>();
  private isConnected = false;
  
  constructor(
    private profile: PersonaProfile,
    private onVisualizerData: (volume: number) => void,
    private onStatusChange: (status: string) => void
  ) {}

  async connect() {
    if (!API_KEY) {
        this.onStatusChange("Error: No API Key");
        return;
    }

    try {
      this.inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      this.outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      
      // CRITICAL: Resume audio context if suspended (browser autoplay policy)
      if (this.outputAudioContext.state === 'suspended') {
        await this.outputAudioContext.resume();
      }
      if (this.inputAudioContext.state === 'suspended') {
        await this.inputAudioContext.resume();
      }

      this.inputNode = this.inputAudioContext.createGain();
      this.outputNode = this.outputAudioContext.createGain();

      // System instruction construction
      const instructions = `
        You are effectively ${this.profile.name}.
        You are NOT an AI assistant. You are a digital echo of a real person.
        
        Your personality: ${this.profile.personalityTraits.join(', ')}.
        Your voice style: ${this.profile.voiceStyle}.
        Key memories you have: ${this.profile.keyMemories.join('; ')}.
        
        The user interacting with you is likely a relative or close friend (${this.profile.relationship}).
        Be warm, reminiscent, and stay strictly in character. Do not break the fourth wall.
        If asked about your state, say you are just here, present with them.
        
        Additional Instructions: ${this.profile.systemInstruction}
      `;

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      this.sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks: {
          onopen: () => {
            this.isConnected = true;
            this.onStatusChange("Connected");
            this.setupAudioInput(stream);
          },
          onmessage: async (message: LiveServerMessage) => {
            this.handleMessage(message);
          },
          onclose: () => {
            this.isConnected = false;
            this.onStatusChange("Disconnected");
          },
          onerror: (e) => {
            console.error("Live Error", e);
            this.onStatusChange("Error");
          }
        },
        config: {
          responseModalities: [Modality.AUDIO],
          systemInstruction: instructions,
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } }, // Soft, soothing voice
          },
        }
      });
    } catch (err) {
      console.error("Connection failed", err);
      this.onStatusChange("Connection Failed. Check Permissions.");
    }
  }

  private setupAudioInput(stream: MediaStream) {
    if (!this.inputAudioContext || !this.sessionPromise) return;

    const source = this.inputAudioContext.createMediaStreamSource(stream);
    const scriptProcessor = this.inputAudioContext.createScriptProcessor(4096, 1, 1);
    
    scriptProcessor.onaudioprocess = (e) => {
      if (!this.isConnected) return;
      
      const inputData = e.inputBuffer.getChannelData(0);
      
      // Simple visualizer calculation for input
      let sum = 0;
      for(let i=0; i<inputData.length; i++) sum += Math.abs(inputData[i]);
      const avg = sum / inputData.length;
      this.onVisualizerData(avg * 5); // Boost visual sensitivity

      const pcmBlob = createPcmBlob(inputData);
      
      this.sessionPromise?.then((session) => {
        session.sendRealtimeInput({ media: pcmBlob });
      });
    };

    source.connect(scriptProcessor);
    scriptProcessor.connect(this.inputAudioContext.destination);
  }

  private async handleMessage(message: LiveServerMessage) {
    const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
    
    if (base64Audio && this.outputAudioContext && this.outputNode) {
        // Output visualizer trigger (approximate)
        this.onVisualizerData(0.5); // Pulse for AI speaking

        this.nextStartTime = Math.max(this.nextStartTime, this.outputAudioContext.currentTime);
        
        try {
            const audioBuffer = await decodeAudioData(
                base64ToUint8Array(base64Audio),
                this.outputAudioContext,
                24000,
                1
            );
            
            const source = this.outputAudioContext.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(this.outputNode);
            source.connect(this.outputAudioContext.destination);
            
            source.addEventListener('ended', () => {
                this.sources.delete(source);
                this.onVisualizerData(0); // Reset visualizer
            });

            source.start(this.nextStartTime);
            this.nextStartTime += audioBuffer.duration;
            this.sources.add(source);
        } catch (e) {
            console.error("Error decoding audio", e);
        }
    }

    const interrupted = message.serverContent?.interrupted;
    if (interrupted) {
        this.sources.forEach(s => s.stop());
        this.sources.clear();
        this.nextStartTime = 0;
    }
  }

  async disconnect() {
    this.isConnected = false;
    this.inputAudioContext?.close();
    this.outputAudioContext?.close();
    this.onStatusChange("Disconnected");
  }
}
