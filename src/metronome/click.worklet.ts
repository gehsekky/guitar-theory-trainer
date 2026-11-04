// Runs on the audio thread. It's loaded with audioWorklet.addModule(), so it
// isn't part of the main bundle and can't use anything from the page.

import { createClickGenerator, type ClickGenerator } from './clickGenerator';
import type { BeatMessage, ClickCommand, ClickOptions } from './clickProtocol';

// The worklet scope's globals aren't in TypeScript's libraries.
declare const sampleRate: number;
declare const currentFrame: number;
declare class AudioWorkletProcessor {
  readonly port: MessagePort;
  constructor(options: { processorOptions: ClickOptions });
}
declare function registerProcessor(
  name: string,
  processor: new (options: { processorOptions: ClickOptions }) => AudioWorkletProcessor,
): void;

class ClickProcessor extends AudioWorkletProcessor {
  private generator: ClickGenerator;
  private stopped = false;

  constructor(options: { processorOptions: ClickOptions }) {
    super(options);
    const { bpm, meter } = options.processorOptions;
    this.generator = createClickGenerator(sampleRate, bpm, meter, currentFrame);
    this.port.onmessage = (event: MessageEvent<ClickCommand>) => {
      const command = event.data;
      if (command.type === 'bpm') this.generator.setBpm(command.bpm);
      else if (command.type === 'meter') this.generator.setMeter(command.meter);
      else if (command.type === 'restart') this.generator.restart();
      else this.stopped = true;
    };
  }

  process(_inputs: Float32Array[][], outputs: Float32Array[][]): boolean {
    if (this.stopped) return false;
    this.generator.render(outputs[0][0], (beat, frame) => {
      const message: BeatMessage = { beat, frame };
      this.port.postMessage(message);
    });
    return true;
  }
}

registerProcessor('click-processor', ClickProcessor);
