package com.proofofpassportapp;

import android.app.Activity;
import android.content.Intent;
import android.content.pm.PackageManager;
import androidx.annotation.NonNull;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import com.facebook.react.bridge.ActivityEventListener;
import com.facebook.react.bridge.BaseActivityEventListener;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.blikoon.qrcodescanner.QrCodeActivity;
import android.Manifest;

public class QRCodeScannerModule extends ReactContextBaseJavaModule {

    private static final int REQUEST_CODE_QR_SCAN = 101;
    private static final int PERMISSION_REQUEST_CAMERA = 1;
    private Promise scanPromise;

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
            }
        }
    };

    QRCodeScannerModule(ReactApplicationContext reactContext) {
        super(reactContext);
        reactContext.addActivityEventListener(activityEventListener);
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

    private void startQRScanner(Activity activity) {
        Intent intent = new Intent(activity, QrCodeActivity.class);
        activity.startActivityForResult(intent, REQUEST_CODE_QR_SCAN);
    }

    // Add this method to handle permission result
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
}