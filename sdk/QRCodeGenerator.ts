import QRCode from 'easyqrcodejs';
import { AppType } from "../common/src/utils/appType";

export class QRCodeGenerator {
    static async generateQRCode(appData: AppType, size: number = 256): Promise<QRCode> {
        const qrData = this.serializeAppType(appData);
        console.log("qrData", qrData);
        const options = {
            text: qrData,
            width: size,
            height: size,
        };
        const element = document.createElement('div');
        return new QRCode(element, options);
    }

    private static serializeAppType(appType: AppType): string {
        return JSON.stringify(appType);
    }
}
