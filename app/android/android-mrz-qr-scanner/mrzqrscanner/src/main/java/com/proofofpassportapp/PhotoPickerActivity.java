// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

package com.proofofpassportapp;

import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.util.Log;
import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.PickVisualMediaRequest;
import androidx.activity.result.contract.ActivityResultContracts;
import androidx.appcompat.app.AppCompatActivity;

public class PhotoPickerActivity extends AppCompatActivity {

    public static final String EXTRA_SELECTED_URI = "selected_uri";
    public static final String EXTRA_ERROR_MESSAGE = "error_message";
    private static final String TAG = "PhotoPickerActivity";

    private ActivityResultLauncher<PickVisualMediaRequest> photoPickerLauncher;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Register the photo picker launcher using the recommended API
        photoPickerLauncher = registerForActivityResult(
            new ActivityResultContracts.PickVisualMedia(),
            this::handlePhotoPickerResult
        );

        launchPhotoPicker();
    }

    private void launchPhotoPicker() {
        try {
            Log.d(TAG, "Launching modern PickVisualMedia photo picker");

            // Create the request using the recommended builder pattern
            PickVisualMediaRequest request = new PickVisualMediaRequest.Builder()
                .setMediaType(ActivityResultContracts.PickVisualMedia.ImageOnly.INSTANCE)
                .build();

            photoPickerLauncher.launch(request);

        } catch (Exception e) {
            Log.e(TAG, "Failed to launch photo picker: " + e.getMessage());
            finishWithError("Failed to launch photo picker: " + e.getMessage());
        }
    }

    private void handlePhotoPickerResult(Uri selectedUri) {
        if (selectedUri != null) {
            Log.d(TAG, "Photo picker returned URI: " + selectedUri);
            finishWithResult(selectedUri);
        } else {
            Log.d(TAG, "Photo picker was cancelled");
            finishWithError("Photo selection was cancelled");
        }
    }

    private void finishWithResult(Uri selectedUri) {
        Intent resultIntent = new Intent();
        resultIntent.putExtra(EXTRA_SELECTED_URI, selectedUri.toString());
        setResult(RESULT_OK, resultIntent);
        finish();
    }

    private void finishWithError(String errorMessage) {
        Intent resultIntent = new Intent();
        resultIntent.putExtra(EXTRA_ERROR_MESSAGE, errorMessage);
        setResult(RESULT_CANCELED, resultIntent);
        finish();
    }
}
