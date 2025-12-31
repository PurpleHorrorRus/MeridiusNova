import { usePlayerStore } from "./player";

export const useEqualizerStore = defineStore("equalizer", {
	state: (): {
		enabled: boolean;
		levels: number[];
		frequencies: BiquadFilterNode[];
		connected: boolean;
		audioContext: AudioContext | null;
		sourceNode: MediaElementAudioSourceNode | null;
		outputGain: GainNode | null;
		equalizerGain: GainNode | null;
	} => ({
		enabled: false,
		levels: new Array(18).fill(0),
		frequencies: [],
		connected: false,
		audioContext: null,
		sourceNode: null,
		outputGain: null,
		equalizerGain: null
	}),

	actions: {
		setEnabled(enabled: boolean) {
			this.enabled = enabled;

			if (this.connected && this.sourceNode && this.audioContext) {
				const playerStore = usePlayerStore();
				const currentController = playerStore.getCurrentController();
				
				// If nodes are missing, reconnect to ensure everything is set up
				if ((!this.outputGain || !this.equalizerGain) && currentController?.gainNode) {
					this.connect(this.sourceNode, this.audioContext, currentController.gainNode);
					return;
				}

				if (this.outputGain && this.equalizerGain) {
					this.outputGain.gain.value = enabled ? 0 : 1;
					this.equalizerGain.gain.value = enabled ? 1 : 0;
				}
			} else if (enabled && !this.connected && import.meta.client) {
				// Try to connect to current controller if not connected
				const playerStore = usePlayerStore();
				const currentController = playerStore.getCurrentController();
				const audioContext = this.audioContext || playerStore.audioContext;
				
				if (currentController?.sourceNode && audioContext && currentController.gainNode) {
					if (!this.audioContext) {
						this.audioContext = audioContext;
					}
					this.connect(currentController.sourceNode, audioContext, currentController.gainNode);
				}
			}
		},

		setLevels(levels: number[]) {
			this.levels = [...levels];
			this.frequencies.forEach((filter, index) => {
				if (filter && levels[index] !== undefined) {
					filter.gain.value = levels[index];
				}
			});
		},

		setLevel(index: number, value: number) {
			this.levels[index] = value;
			if (this.frequencies[index]) {
				this.frequencies[index].gain.value = value;
			}
		},

		connect(sourceNode: MediaElementAudioSourceNode, audioContext: AudioContext, outputNode: AudioNode) {
			if (!sourceNode || !audioContext || !outputNode || !import.meta.client) {
				return;
			}

			// Disconnect from previous sourceNode if different
			if (this.connected && this.sourceNode && this.sourceNode !== sourceNode) {
				if (this.sourceNode) {
					this.sourceNode.disconnect();
				}
			}

			this.audioContext = audioContext;
			this.sourceNode = sourceNode;

			const frequenciesMap = [31, 63, 87, 125, 175, 250, 350, 500, 700, 1000, 1400, 2000, 2800, 4000, 5600, 8000, 11200, 16000];

			if (this.frequencies.length === 0) {
				this.frequencies = frequenciesMap.map((frequency, index) => {
					const filter = this.audioContext!.createBiquadFilter();
					filter.type = "peaking";
					filter.frequency.value = frequency;
					filter.Q.value = 1;
					filter.gain.value = this.levels[index] || 0;
					return filter;
				});

				this.frequencies.reduce((prev, curr) => {
					prev.connect(curr);
					return curr;
				});
			}

			// Create outputGain for direct path
			if (!this.outputGain) {
				this.outputGain = this.audioContext.createGain();
			}
			this.outputGain.disconnect();
			this.outputGain.connect(outputNode);

			// Create equalizerGain and connect to filter chain
			if (this.frequencies.length > 0) {
				const firstFrequency = this.frequencies[0];
				const lastFrequency = this.frequencies[this.frequencies.length - 1];
				
				if (firstFrequency && lastFrequency) {
					// Ensure filter chain is connected
					for (let i = 0; i < this.frequencies.length - 1; i++) {
						const current = this.frequencies[i];
						const next = this.frequencies[i + 1];
						if (current && next) {
							current.disconnect();
							current.connect(next);
						}
					}
					
					if (!this.equalizerGain) {
						this.equalizerGain = this.audioContext.createGain();
					}
					
					// Disconnect equalizerGain from any previous connections
					this.equalizerGain.disconnect();
					// Connect equalizerGain to first filter
					this.equalizerGain.connect(firstFrequency);
					
					// Reconnect last frequency to output
					lastFrequency.disconnect();
					lastFrequency.connect(outputNode);
				}
			}

			// Connect sourceNode to both paths
			if (this.sourceNode) {
				this.sourceNode.disconnect();
				
				// Direct path: sourceNode -> outputGain -> outputNode
				if (this.outputGain) {
					this.sourceNode.connect(this.outputGain);
				}
				
				// Equalizer path: sourceNode -> equalizerGain -> firstFrequency -> ... -> lastFrequency -> outputNode
				if (this.equalizerGain) {
					this.sourceNode.connect(this.equalizerGain);
				}
			}

			// Set initial gain values based on enabled state
			if (this.outputGain) {
				this.outputGain.gain.value = this.enabled ? 0 : 1;
			}

			if (this.equalizerGain) {
				this.equalizerGain.gain.value = this.enabled ? 1 : 0;
			}

			this.connected = true;
		},

		disconnect() {
			if (!this.connected || !this.sourceNode) {
				return;
			}

			// Disconnect from sourceNode
			if (this.sourceNode) {
				this.sourceNode.disconnect();
			}

			// Disconnect gain nodes
			if (this.outputGain) {
				this.outputGain.disconnect();
			}

			if (this.equalizerGain) {
				this.equalizerGain.disconnect();
			}

			if (this.frequencies.length > 0) {
				const lastFrequency = this.frequencies[this.frequencies.length - 1];
				if (lastFrequency) {
					lastFrequency.disconnect();
				}
			}

			this.connected = false;
			this.sourceNode = null;
		}
	}
});
