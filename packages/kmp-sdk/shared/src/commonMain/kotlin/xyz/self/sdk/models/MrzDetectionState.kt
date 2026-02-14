package xyz.self.sdk.models

/**
 * Represents the current state of MRZ detection during camera scanning
 */
enum class MrzDetectionState {
    /** No text detected in frame */
    NO_TEXT,

    /** Text detected but no MRZ pattern found */
    TEXT_DETECTED,

    /** One MRZ line found (need 2 for passport) */
    ONE_MRZ_LINE,

    /** Two MRZ lines found - about to complete */
    TWO_MRZ_LINES,
}
