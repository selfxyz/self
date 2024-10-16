import { NativeModules, Platform } from "react-native";
// import { AppType, reconstructAppType } from "../../../common/src/utils/appType";
import useNavigationStore from '../stores/navigationStore';
import { getCircuitName, parseDSC } from "../../../common/src/utils/certificates/handleCertificate";
import useUserStore from "../stores/userStore";
import { downloadZkey } from "./zkeyDownload";
import msgpack from "msgpack-lite";
import pako from "pako";
import { OpenPassportApp } from "../../../common/src/utils/appType";

export const scanQRCode = () => {
    const { toast, setSelectedApp, setSelectedTab } = useNavigationStore.getState();

    if (Platform.OS === 'ios') {
        if (NativeModules.QRScannerBridge && NativeModules.QRScannerBridge.scanQRCode) {
            NativeModules.QRScannerBridge.scanQRCode()
                .then((result: string) => {
                    handleQRCodeScan(result, toast, setSelectedApp, setSelectedTab);
                })
                .catch((error: any) => {
                    console.error('QR Scanner Error:', error);
                    toast.show('Error', {
                        message: 'Failed to scan QR code',
                        type: 'error',
                    });
                });
        } else {
            console.error('QR Scanner module not found for iOS');
            toast.show('Error', {
                message: 'QR Scanner not available',
                type: 'error',
            });
        }
    } else if (Platform.OS === 'android') {
        if (NativeModules.QRCodeScanner && NativeModules.QRCodeScanner.scanQRCode) {
            NativeModules.QRCodeScanner.scanQRCode()
                .then((result: string) => {
                    handleQRCodeScan(result, toast, setSelectedApp, setSelectedTab);
                })
                .catch((error: any) => {
                    console.error('QR Scanner Error:', error);
                    toast.show('Error', {
                        message: 'Failed to scan QR code',
                        type: 'error',
                    });
                });
        } else {
            console.error('QR Scanner module not found for Android');
            toast.show('Error', {
                message: 'QR Scanner not available',
                type: 'error',
            });
        }
    }
};

const handleQRCodeScan = (result: string, toast: any, setSelectedApp: any, setSelectedTab: any) => {
    try {
        console.log(result);
        const decodedResult = atob(result);
        const uint8Array = new Uint8Array(decodedResult.split('').map(char => char.charCodeAt(0)));
        const decompressedData = pako.inflate(uint8Array);
        const unpackedData = msgpack.decode(decompressedData);
        console.log(unpackedData);
        const openPassportApp: OpenPassportApp = unpackedData;
        setSelectedApp(openPassportApp);
        const dsc = useUserStore.getState().passportData.dsc;
        const sigAlgName = parseDSC(dsc!);
        if (openPassportApp.mode == 'vc_and_disclose') {
            downloadZkey('vc_and_disclose');
        }
        else {
            const circuitName = getCircuitName("prove", sigAlgName.signatureAlgorithm, sigAlgName.hashFunction);
            downloadZkey(circuitName as any);
        }
        setSelectedTab("prove");
        toast.show('✅', {
            message: "QR code scanned",
            customData: {
                type: "success",
            },
        })


    } catch (error) {
        console.error('Error parsing QR code result:', error);
        toast.show('Try again', {
            message: "Error reading QR code",
            customData: {
                type: "info",
            },
        })
    }
};