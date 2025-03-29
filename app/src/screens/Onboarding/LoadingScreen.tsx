import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { StaticScreenProps } from "@react-navigation/native";
import LottieView from "lottie-react-native";

import failAnimation from "../../assets/animations/loading/fail.json";
import miscAnimation from "../../assets/animations/loading/misc.json";
import successAnimation from "../../assets/animations/loading/success.json";
import useHapticNavigation from "../../hooks/useHapticNavigation";
import { usePassportProcessing } from "../../stores/passportProcessingProvider";
import { ProofStatusEnum, useProofInfo } from "../../stores/proofProvider";
import { red500 } from "../../utils/colors";

type LoadingScreenProps = StaticScreenProps<{}>;

const LoadingScreen: React.FC<LoadingScreenProps> = ({}) => {
	const goToSuccessScreen = useHapticNavigation("AccountVerifiedSuccess");
	const goToErrorScreen = useHapticNavigation("Launch");
	const { registerValidPassport } = usePassportProcessing();

	const goToSuccessScreenWithDelay = () => {
		setTimeout(() => {
			goToSuccessScreen();
		}, 3000);
	};
	const goToErrorScreenWithDelay = () => {
		setTimeout(() => {
			goToErrorScreen();
		}, 3000);
	};
	const [animationSource, setAnimationSource] = useState<any>(miscAnimation);
	const { registrationStatus, resetProof } = useProofInfo();

	useEffect(() => {
		// TODO this makes sense if reset proof was only about passport registration
		resetProof();
	}, []);

	useEffect(() => {
		registerValidPassport();
	}, [registerValidPassport]);

	useEffect(() => {
		console.log("registrationStatus", registrationStatus);
		if (registrationStatus === ProofStatusEnum.SUCCESS) {
			setAnimationSource(successAnimation);
			goToSuccessScreenWithDelay();
			setTimeout(() => resetProof(), 3000);
		} else if (
			registrationStatus === ProofStatusEnum.FAILURE ||
			registrationStatus === ProofStatusEnum.ERROR
		) {
			setAnimationSource(failAnimation);
			goToErrorScreenWithDelay();
			setTimeout(() => resetProof(), 3000);
		}
	}, [registrationStatus]);

	return (
		<View style={styles.container}>
			<LottieView
				autoPlay
				loop={animationSource === miscAnimation}
				source={animationSource}
				style={styles.animation}
				resizeMode="cover"
				renderMode="HARDWARE"
			/>
			<Text style={styles.warningContainer}>
				<Text style={styles.warningText}>
					This can take up to one minute, don't close the app.
				</Text>
			</Text>
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		position: "relative",
	},
	animation: {
		position: "absolute",
		top: 0,
		left: 0,
		right: 0,
		bottom: 0,
	},
	warningContainer: {
		position: "absolute",
		bottom: 40,
		left: 0,
		right: 0,
		textAlign: "center",
		padding: 16,
	},
	warningText: {
		color: "white",
		fontWeight: "500",
		fontSize: 16,
	},
	statusText: {
		color: "white",
		fontWeight: "bold",
		fontSize: 16,
	},
	errorText: {
		color: red500,
		fontWeight: "bold",
		fontSize: 16,
	},
	errorDescription: {
		color: red500,
		fontSize: 12,
		opacity: 0.8,
	},
});

export default LoadingScreen;
