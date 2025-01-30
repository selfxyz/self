package com.proofofpassportapp;

import static com.google.android.gms.common.util.CollectionUtils.listOf;

import androidx.annotation.NonNull;

import com.facebook.react.ReactPackage;
import com.facebook.react.bridge.NativeModule;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.uimanager.ViewManager;
import java.util.ArrayList;
import java.util.List;

public class CameraActivityPackage implements ReactPackage {

    @Override
    public List<ViewManager> createViewManagers(ReactApplicationContext reactContext) {
        return List.of(
                new com.proofofpassportapp.ui.CameraViewManager(reactContext)
        );
    }

    @Override
    public List<NativeModule> createNativeModules(ReactApplicationContext reactContext) {
        List<NativeModule> modules = new ArrayList<>();
//        modules.add(new CameraActivityModule(reactContext));
        return modules;
    }
}