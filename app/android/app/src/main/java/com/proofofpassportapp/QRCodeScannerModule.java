// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

package com.proofofpassportapp;

import android.app.Activity;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.net.Uri;
import android.os.Build;
import androidx.annotation.NonNull;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import com.facebook.react.bridge.ActivityEventListener;
import com.facebook.react.bridge.BaseActivityEventListener;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.LifecycleEventListener;
import com.blikoon.qrcodescanner.QrCodeActivity;
import android.Manifest;
import com.proofofpassportapp.utils.QrCodeDetectorProcessor;
import example.jllarraz.com.passportreader.mlkit.FrameMetadata;
import java.io.InputStream;

public class QRCodeScannerModule extends ReactContextBaseJavaModule implements LifecycleEventListener {

    private static final int REQUEST_CODE_QR_SCAN = 101;
    private static final int REQUEST_CODE_PHOTO_PICK = 102;
    private static final int REQUEST_CODE_MODERN_PHOTO_PICK = 103;
    private static final int PERMISSION_REQUEST_CAMERA = 1;
    private Promise scanPromise;
    private Promise photoLibraryPromise;

    private final ActivityEventListener activityEventListener = new BaseActivityEventListener() {
        @Override
        public void onActivityResult(Activity activity, int requestCode, int resultCode, Intent data) {
            if (requestCode == REQUEST_CODE_QR_SCAN) {
                if (scanPromise != null) {
                    if (resultCode == Activity.RESULT_OK) {
                        String result = data.getStringExtra("com.blikoon.qrcodescanner.got_qr_scan_relult");
                        scanPromise.resolve(result);
                    } else {
                        scanPromise.reject("SCAN_FAILED", "QR Code scanning failed or was cancelled");
                    }
                    scanPromise = null;
                }
            } else if (requestCode == REQUEST_CODE_PHOTO_PICK && photoLibraryPromise != null) {
                // Handle legacy photo picker result for older devices
                if (resultCode == Activity.RESULT_OK && data != null && data.getData() != null) {
                    processImageForQRCode(data.getData());
                } else {
                    photoLibraryPromise.reject("PHOTO_PICKER_CANCELLED", "Photo selection was cancelled");
                    photoLibraryPromise = null;
                }
            } else if (requestCode == REQUEST_CODE_MODERN_PHOTO_PICK && photoLibraryPromise != null) {
                // Handle modern photo picker result from dedicated activity
                if (resultCode == Activity.RESULT_OK && data != null) {
                    String uriString = data.getStringExtra(PhotoPickerActivity.EXTRA_SELECTED_URI);
                    if (uriString != null) {
                        processImageForQRCode(Uri.parse(uriString));
                    } else {
                        photoLibraryPromise.reject("PHOTO_PICKER_ERROR", "No URI returned from photo picker");
                        photoLibraryPromise = null;
                    }
                } else {
                    String errorMessage = data != null ? data.getStringExtra(PhotoPickerActivity.EXTRA_ERROR_MESSAGE) : "Photo selection was cancelled";
                    photoLibraryPromise.reject("PHOTO_PICKER_CANCELLED", errorMessage);
                    photoLibraryPromise = null;
                }
            }
        }
    };

    public QRCodeScannerModule(ReactApplicationContext reactContext) {
        super(reactContext);
        reactContext.addActivityEventListener(activityEventListener);
        reactContext.addLifecycleEventListener(this);

    }

    @NonNull
    @Override
    public String getName() {
        return "QRCodeScanner";
    }

    @ReactMethod
    public void scanQRCode(Promise promise) {
        Activity currentActivity = getCurrentActivity();
        if (currentActivity == null) {
            promise.reject("ACTIVITY_DOES_NOT_EXIST", "Activity doesn't exist");
            return;
        }

        scanPromise = promise;

        if (ContextCompat.checkSelfPermission(currentActivity, Manifest.permission.CAMERA)
                != PackageManager.PERMISSION_GRANTED) {
            ActivityCompat.requestPermissions(currentActivity,
                    new String[]{Manifest.permission.CAMERA},
                    PERMISSION_REQUEST_CAMERA);
        } else {
            startQRScanner(currentActivity);
        }
    }

    @ReactMethod
    public void scanQRCodeFromPhotoLibrary(Promise promise) {
        Activity currentActivity = getCurrentActivity();
        if (currentActivity == null) {
            promise.reject("ACTIVITY_DOES_NOT_EXIST", "Activity doesn't exist");
            return;
        }

        photoLibraryPromise = promise;

        // we first try with the recomended approach. This should be sufficient for most devices with play service.
        // It fallsback to document picker if photo-picker is not available.
        try {
            android.util.Log.d("QRCodeScanner", "Using recommended PickVisualMedia photo picker via dedicated activity");
            Intent intent = new Intent(currentActivity, PhotoPickerActivity.class);
            currentActivity.startActivityForResult(intent, REQUEST_CODE_MODERN_PHOTO_PICK);
            return;
        } catch (Exception e) {
            android.util.Log.d("QRCodeScanner", "Modern photo picker activity failed: " + e.getMessage());
        }

        // Fallback to intent-based photo picker for Android 13+
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            try {
                android.util.Log.d("QRCodeScanner", "Using intent-based modern photo picker (Android 13+)");
                Intent intent = new Intent("android.provider.action.PICK_IMAGES");
                intent.setType("image/*");
                currentActivity.startActivityForResult(intent, REQUEST_CODE_PHOTO_PICK);
                return;
            } catch (Exception e) {
                android.util.Log.d("QRCodeScanner", "Intent-based modern photo picker failed: " + e.getMessage());
            }
        }

        // Final fallback to legacy photo picker
        android.util.Log.d("QRCodeScanner", "Using legacy Intent.ACTION_PICK photo picker");
        Intent intent = new Intent(Intent.ACTION_PICK);
        intent.setType("image/*");
        currentActivity.startActivityForResult(intent, REQUEST_CODE_PHOTO_PICK);
    }

    private void startQRScanner(Activity activity) {
        Intent intent = new Intent(activity, QrCodeActivity.class);
        activity.startActivityForResult(intent, REQUEST_CODE_QR_SCAN);
    }

    private void processImageForQRCode(Uri imageUri) {
        try {
            Activity currentActivity = getCurrentActivity();
            if (currentActivity == null) {
                if (photoLibraryPromise != null) {
                    photoLibraryPromise.reject("ACTIVITY_DOES_NOT_EXIST", "Activity doesn't exist");
                    photoLibraryPromise = null;
                }
                return;
            }

            InputStream inputStream = currentActivity.getContentResolver().openInputStream(imageUri);
            Bitmap bitmap = BitmapFactory.decodeStream(inputStream);
            inputStream.close();

            if (bitmap == null) {
                if (photoLibraryPromise != null) {
                    photoLibraryPromise.reject("IMAGE_LOAD_FAILED", "Failed to load selected image");
                    photoLibraryPromise = null;
                }
                return;
            }

            // use the exising qrcode processor we already have.
            QrCodeDetectorProcessor processor = new QrCodeDetectorProcessor();
            processor.detectQrCodeInBitmap(bitmap, new QrCodeDetectorProcessor.Listener() {
                @Override
                public void onSuccess(String results, FrameMetadata frameMetadata, long timeRequired, Bitmap bitmap) {
                    if (photoLibraryPromise != null) {
                        photoLibraryPromise.resolve(results);
                        photoLibraryPromise = null;
                    }
                }

                @Override
                public void onFailure(Exception e, long timeRequired) {
                    if (photoLibraryPromise != null) {
                        photoLibraryPromise.reject("QR_DETECTION_FAILED", "No QR code found in selected image: " + e.getMessage());
                        photoLibraryPromise = null;
                    }
                }

                @Override
                public void onCompletedFrame(long timeRequired) {
                    if (photoLibraryPromise != null) {
                        photoLibraryPromise.reject("QR_DETECTION_FAILED", "No QR code found in selected image");
                        photoLibraryPromise = null;
                    }
                }
            });

        } catch (Exception e) {
            if (photoLibraryPromise != null) {
                photoLibraryPromise.reject("IMAGE_PROCESSING_ERROR", "Error processing image: " + e.getMessage());
                photoLibraryPromise = null;
            }
        }
    }

    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        if (requestCode == PERMISSION_REQUEST_CAMERA) {
            if (grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
                Activity currentActivity = getCurrentActivity();
                if (currentActivity != null) {
                    startQRScanner(currentActivity);
                }
            } else {
                if (scanPromise != null) {
                    scanPromise.reject("PERMISSION_DENIED", "Camera permission was denied");
                    scanPromise = null;
                }
            }
        }
    }

    // Lifecycle methods
    @Override
    public void onHostResume() {
    }

    @Override
    public void onHostPause() {
    }

    @Override
    public void onHostDestroy() {
        getReactApplicationContext().removeActivityEventListener(activityEventListener);
        getReactApplicationContext().removeLifecycleEventListener(this);
    }
}
