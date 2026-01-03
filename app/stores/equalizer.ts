import { usePlayerStore } from "./player";

interface EqualizerNodes {
	frequencies: BiquadFilterNode[];
	outputGain: GainNode;
	equalizerGain: GainNode;
	analyser: AnalyserNode | null;
}

let spectrumAnalyzerEnabled = false;

export const useEqualizerStore = defineStore("equalizer", {
	state: (): {
		enabled: boolean;
		levels: number[];
		audioContext: AudioContext | null;
		nodesMap: Map<MediaElementAudioSourceNode, EqualizerNodes>;
	} => ({
		enabled: false,
		levels: new Array(18).fill(0),
		audioContext: null,
		nodesMap: new Map()
	}),

	actions: {
		setEnabled(enabled: boolean) {
			this.enabled = enabled;

			// Update all existing equalizer instances
			this.nodesMap.forEach((nodes) => {
				nodes.outputGain.gain.value = enabled ? 0 : 1;
				nodes.equalizerGain.gain.value = enabled ? 1 : 0;
			});

			if (enabled && import.meta.client) {
				const playerStore = usePlayerStore();
				const currentController = playerStore.getCurrentController();
				const audioContext = this.audioContext || playerStore.audioContext;
				
				if (currentController?.sourceNode && audioContext && currentController.gainNode) {
					if (!this.audioContext) {
						this.audioContext = audioContext;
					}
					const existingNodes = this.nodesMap.get(currentController.sourceNode);
					if (!existingNodes) {
						this.connect(currentController.sourceNode, audioContext, currentController.gainNode);
					} else if (spectrumAnalyzerEnabled && !existingNodes.analyser) {
						// Если анализатор должен быть создан, но его нет, переподключаем
						this.disconnect(currentController.sourceNode);
						this.connect(currentController.sourceNode, audioContext, currentController.gainNode);
					}
				}
			}
		},

		setLevels(levels: number[]) {
			this.levels = [...levels];
			// Update all existing filter chains
			this.nodesMap.forEach((nodes) => {
				nodes.frequencies.forEach((filter, index) => {
					if (filter && levels[index] !== undefined) {
						filter.gain.value = levels[index];
					}
				});
			});
		},

		setLevel(index: number, value: number) {
			this.levels[index] = value;
			// Update all existing filter chains
			this.nodesMap.forEach((nodes) => {
				if (nodes.frequencies[index]) {
					nodes.frequencies[index].gain.value = value;
				}
			});
		},

		connect(sourceNode: MediaElementAudioSourceNode, audioContext: AudioContext, outputNode: AudioNode) {
			if (!sourceNode || !audioContext || !outputNode || !import.meta.client) {
				return;
			}

			// If already connected for this sourceNode, skip
			if (this.nodesMap.has(sourceNode)) {
				return;
			}

			this.audioContext = audioContext;

			// Create separate filter chain for this controller
			const frequenciesMap = [31, 63, 87, 125, 175, 250, 350, 500, 700, 1000, 1400, 2000, 2800, 4000, 5600, 8000, 11200, 16000];
			const frequencies = frequenciesMap.map((frequency, index) => {
				const filter = audioContext.createBiquadFilter();
				filter.type = "peaking";
				filter.frequency.value = frequency;
				filter.Q.value = 1;
				filter.gain.value = this.levels[index] || 0;
				return filter;
			});

			// Connect filter chain
			frequencies.reduce((prev, curr) => {
				prev.connect(curr);
				return curr;
			});

			// Create analyser node for frequency analysis only if spectrum analyzer is enabled
			let analyser: AnalyserNode | null = null;
			if (spectrumAnalyzerEnabled) {
				analyser = audioContext.createAnalyser();
				analyser.fftSize = 2048;
				analyser.smoothingTimeConstant = 0.1;
			}
			
			// Create outputGain for direct path (when equalizer is disabled)
			const outputGain = audioContext.createGain();
			outputGain.gain.value = this.enabled ? 0 : 1;

			// Create equalizerGain and connect to filter chain
			const firstFrequency = frequencies[0];
			const lastFrequency = frequencies[frequencies.length - 1];
			
			if (!firstFrequency || !lastFrequency) {
				return;
			}

			const equalizerGain = audioContext.createGain();
			equalizerGain.connect(firstFrequency);
			equalizerGain.gain.value = this.enabled ? 1 : 0;

			// Connect analyser to outputNode if it exists
			if (analyser) {
				analyser.connect(outputNode);
				// Connect both paths to analyser
				// When equalizer is enabled: signal goes through equalizer -> analyser (outputGain is muted)
				// When equalizer is disabled: signal goes through outputGain -> analyser (equalizerGain is muted)
				outputGain.connect(analyser);
				lastFrequency.connect(analyser);
			} else {
				// If no analyser, connect both paths directly to outputNode
				outputGain.connect(outputNode);
				lastFrequency.connect(outputNode);
			}

			// Connect sourceNode to both paths
			sourceNode.disconnect();
			sourceNode.connect(outputGain);
			sourceNode.connect(equalizerGain);

			// Store nodes for this sourceNode
			this.nodesMap.set(sourceNode, {
				frequencies,
				outputGain,
				equalizerGain,
				analyser
			});

		},

		disconnect(sourceNode: MediaElementAudioSourceNode) {
			const nodes = this.nodesMap.get(sourceNode);
			if (!nodes) {
				return;
			}

			// Disconnect from sourceNode
			sourceNode.disconnect();

			// Disconnect gain nodes
			nodes.outputGain.disconnect();
			nodes.equalizerGain.disconnect();

			// Disconnect analyser
			if (nodes.analyser) {
				nodes.analyser.disconnect();
			}

			// Disconnect filter chain
			const lastFrequency = nodes.frequencies[nodes.frequencies.length - 1];
			if (lastFrequency) {
				lastFrequency.disconnect();
			}

			// Remove from map
			this.nodesMap.delete(sourceNode);
		},

		getAnalyserNode(): AnalyserNode | null {
			if (!import.meta.client) {
				return null;
			}

			const playerStore = usePlayerStore();
			const currentController = playerStore.getCurrentController();

			if (!currentController?.sourceNode) {
				return null;
			}

			const nodes = this.nodesMap.get(currentController.sourceNode);
			return nodes?.analyser || null;
		},

		setSpectrumAnalyzerEnabled(enabled: boolean) {
			spectrumAnalyzerEnabled = enabled;
		}
	}
});
