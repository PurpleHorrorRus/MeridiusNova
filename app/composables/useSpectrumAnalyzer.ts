import { computed, onUnmounted } from "vue";
import { useEqualizerStore } from "~/stores/equalizer";
import { usePlayerStore } from "~/stores/player";

export const useSpectrumAnalyzer = () => {
	const equalizerStore = useEqualizerStore();
	const playerStore = usePlayerStore();
	
	let isActive = false;

	const connect = () => {
		if (!import.meta.client || isActive) {
			return;
		}

		const currentController = playerStore.getCurrentController();
		if (!currentController?.sourceNode || !currentController?.gainNode || !playerStore.audioContext) {
			return;
		}

		// Включаем создание анализатора в эквалайзере
		equalizerStore.setSpectrumAnalyzerEnabled(true);

		// Если эквалайзер уже подключен, нужно переподключить его с анализатором
		const equalizerNodes = equalizerStore.nodesMap.get(currentController.sourceNode);
		if (equalizerNodes && !equalizerNodes.analyser) {
			// Переподключаем эквалайзер с анализатором
			equalizerStore.disconnect(currentController.sourceNode);
			equalizerStore.connect(currentController.sourceNode, playerStore.audioContext, currentController.gainNode);
		}

		isActive = true;
	};

	const disconnect = () => {
		if (!isActive) {
			return;
		}

		// Отключаем создание анализатора в эквалайзере
		equalizerStore.setSpectrumAnalyzerEnabled(false);

		// Если эквалайзер подключен, нужно переподключить его без анализатора
		const currentController = playerStore.getCurrentController();
		if (currentController?.sourceNode && currentController?.gainNode && playerStore.audioContext) {
			const equalizerNodes = equalizerStore.nodesMap.get(currentController.sourceNode);
			if (equalizerNodes && equalizerNodes.analyser) {
				// Переподключаем эквалайзер без анализатора
				equalizerStore.disconnect(currentController.sourceNode);
				equalizerStore.connect(currentController.sourceNode, playerStore.audioContext, currentController.gainNode);
			}
		}

		isActive = false;
	};

	const getAnalyser = (): AnalyserNode | null => {
		return equalizerStore.getAnalyserNode();
	};

	onUnmounted(() => {
		disconnect();
	});

	return {
		connect,
		disconnect,
		getAnalyser,
		isActive: computed(() => isActive)
	};
};

