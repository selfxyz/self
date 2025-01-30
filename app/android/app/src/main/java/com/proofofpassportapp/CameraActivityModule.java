package com.proofofpassportapp;


import android.app.Activity;
import android.content.Intent;
import androidx.annotation.NonNull;
import com.facebook.react.bridge.ActivityEventListener;
import com.facebook.react.bridge.BaseActivityEventListener;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import example.jllarraz.com.passportreader.ui.activities.CameraActivity;
import example.jllarraz.com.passportreader.common.IntentData ;
import org.jmrtd.lds.icao.MRZInfo;

public class CameraActivityModule extends ReactContextBaseJavaModule {

    private static ReactApplicationContext reactContext;
    private Promise promise;

    private final ActivityEventListener activityEventListener = new BaseActivityEventListener() {
        @Override
        public void onActivityResult(Activity activity, int requestCode, int resultCode, Intent data) {
            if (requestCode == 1) {
                if (resultCode == Activity.RESULT_OK) {
                    MRZInfo mrzInfo = (MRZInfo) data.getSerializableExtra(IntentData.getKeyMrzInfo());
                    if (mrzInfo != null) {
                        promise.resolve(mrzInfo.toString()); // Or format as needed
                    } else {
                        promise.reject("ERROR", "MRZ info not found");
                    }
                } else if (resultCode == Activity.RESULT_CANCELED) {
                    promise.reject("CANCELLED", "Camera activity cancelled");
                }
            }
        }
    };

    CameraActivityModule(ReactApplicationContext context) {
        super(context);
        reactContext = context;
        reactContext.addActivityEventListener(activityEventListener);
    }

    @Override
    public String getName() {
        return "CameraActivityModule";
    }

    @ReactMethod
    public void startCameraActivity(Promise promise) {
        this.promise = promise;
        Intent intent = new Intent(reactContext, CameraActivity.class);
        getCurrentActivity().startActivityForResult(intent, 1);
    }
}