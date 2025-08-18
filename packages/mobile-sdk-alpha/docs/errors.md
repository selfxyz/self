# Error Classes

| Error Class     | Category     | Code                 | Description                                                  |
| --------------- | ------------ | -------------------- | ------------------------------------------------------------ |
| `NfcParseError` | `validation` | `SELF_ERR_NFC_PARSE` | Thrown when NFC byte streams are malformed or decoding fails |
| `MrzParseError` | `validation` | `SELF_ERR_MRZ_PARSE` | Raised for invalid MRZ characters or formats                 |
| `InitError`     | `init`       | `SELF_ERR_INIT`      | Issues during SDK initialization                             |
| `LivenessError` | `liveness`   | `SELF_ERR_LIVENESS`  | Errors from liveness checks                                  |
| `SdkError`      | varies       | custom               | Base class for all SDK errors                                |

Use typed errors instead of generic `Error` to surface clearer failure modes and consistent categorization.
