import QRCode from 'easyqrcodejs';
import { AppType } from "../common/src/utils/appType";

export class QRCodeGenerator {
    static async generateQRCode(appType: AppType, size: number = 256): Promise<QRCode> {
        const qrData = this.serializeAppType(appType);
        const options = {
            text: qrData,
            width: size,
            height: size,
        };
        const element = document.createElement('div'); // Create a div element to hold the QR code
        const qrcode = new QRCode(element, options);
        return qrcode; // Return the QRCode instance
    }

    private static serializeAppType(appType: AppType): string {
        const serializableData = {
            id: appType.id,
            name: appType.name,
            disclosureOptions: appType.disclosureOptions,
            scope: appType.scope,
            circuit: appType.circuit,
        };

        return JSON.stringify(serializableData);
    }
}