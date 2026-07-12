# Android Tesseract MRZ fallback (SELF-3447)

ML Kit stays the primary MRZ OCR on Android. When a frame yields text but no
check-digit-valid MRZ (ML Kit misreads OCR-B confusables — reads `S0A00A92` as
`SOAOOA92`), `PassportCameraView` runs a second pass with a fine-tuned
Tesseract OCR-B model, fully on-device.

- Trigger + threading: `app/android/app/src/main/java/com/proofofpassportapp/ui/PassportCameraView.kt`
  (`maybeStartTesseractFallback`). Gated by the `TESSERACT_MRZ_FALLBACK`
  build config flag in `app/android/app/build.gradle`; the same flag is the
  hook for a future Tesseract-primary mode.
- Recognizer, model asset, and validation live in the private
  `selfxyz/android-passport-nfc-reader` repo (`:passportreader` module) —
  see the "Tesseract MRZ fallback" section of its README for design, perf
  (~200 ms/frame band OCR), and model provenance/sha256.
- Model training + regeneration pipeline: `services/mrz-vision/tesseract/README.md`.
- Fail closed: only regex + JMRTD check-digit-valid MRZ results dispatch
  through the existing `PassportReadEvent` path; the JS payload shape is
  unchanged.
- iOS already uses Tesseract for MRZ (QKMRZScanner → SwiftyTesseract), so this
  brings platform parity.
