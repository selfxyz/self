# android-mrz-qr-scanner

This module bundles the MRZ (Machine Readable Zone) and QR code scanning
components that were previously spread across the main React Native Android
application and the legacy passport reader sample. It exposes a single React
Native package that provides:

- `PassportOCRViewManager` – renders the camera-driven MRZ scanner.
- `QRCodeScannerViewManager` – renders the QR camera preview.
- `MRZQRScannerModule` – exposes imperative QR code scanning helpers, including
  the modern photo picker flow.

The module ships the shared ML Kit / Fotoapparat processing pipeline, MRZ
parsing utilities, and UI resources so that the main application can depend on a
single Gradle project.

## Building

When used from the React Native app this module is included as a Gradle project
(`:mrzqrscanner`). To build the library in isolation run:

```bash
./gradlew :app:assembleDebug
```

The build enables view binding and pulls in ML Kit, ZXing, Fotoapparat, JMRTD,
RxJava, and AndroidX UI dependencies.
