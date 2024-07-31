import QRCode from 'easyqrcodejs';
import { AppType } from "../common/src/utils/appType";

export class QRCodeGenerator {
    static async generateQRCode(appData: AppType, size: number = 256): Promise<HTMLElement> {
        const qrData = this.serializeAppType(appData);
        const options = {
            text: qrData,
            width: size,
            height: size,
        };
        const element = document.createElement('div');
        new QRCode(element, options);
        return element;
    }


    private static serializeAppType(appType: AppType): string {
        return JSON.stringify(appType);
    }
}
