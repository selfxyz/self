package com.proofofpassport;

import android.app.Activity;
import android.content.Intent;
import androidx.annotation.NonNull;
import com.facebook.react.bridge.ActivityEventListener;
import com.facebook.react.bridge.BaseActivityEventListener;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.blikoon.qrcodescanner.QrCodeActivity;

public class QRCodeScannerModule extends ReactContextBaseJavaModule {

    private static final int REQUEST_CODE_QR_SCAN = 101;
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
                        scanPromise.reject("SCAN_FAILED", "QR Code scanning failed");
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
        Intent intent = new Intent(currentActivity, QrCodeActivity.class);
        currentActivity.startActivityForResult(intent, REQUEST_CODE_QR_SCAN);
    }
}