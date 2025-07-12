// SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11

/*
 * Copyright 2017 The Android Open Source Project
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *       http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package com.proofofpassportapp.ui

import android.Manifest
import android.app.AlertDialog
import android.app.Dialog
import android.content.Context
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.graphics.Color
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.util.Log
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Toast
import androidx.core.content.ContextCompat
import com.google.mlkit.vision.text.Text


import org.jmrtd.lds.icao.MRZInfo

import example.jllarraz.com.passportreader.R
import example.jllarraz.com.passportreader.databinding.FragmentCameraMrzBinding
import example.jllarraz.com.passportreader.mlkit.FrameMetadata
import example.jllarraz.com.passportreader.mlkit.GraphicOverlay
import example.jllarraz.com.passportreader.mlkit.OcrMrzDetectorProcessor
import example.jllarraz.com.passportreader.mlkit.VisionProcessorBase
import example.jllarraz.com.passportreader.ui.fragments.CameraFragment
import example.jllarraz.com.passportreader.utils.MRZUtil
import example.jllarraz.com.passportreader.utils.OcrUtils
import io.fotoapparat.preview.Frame
import io.fotoapparat.view.CameraView
import io.reactivex.Single
import io.reactivex.android.schedulers.AndroidSchedulers
import io.reactivex.disposables.CompositeDisposable
import io.reactivex.schedulers.Schedulers

class CameraMLKitFragment(cameraMLKitCallback: CameraMLKitCallback) : CameraFragment() {

    companion object {
        private const val TAG = "CameraMLKitFragment"
        private const val REQUEST_CAMERA_PERMISSION = 1
        private const val FRAGMENT_DIALOG = "CameraMLKitFragment"
    }

    private var cameraMLKitCallback: CameraMLKitCallback? = cameraMLKitCallback
    private var frameProcessor: OcrMrzDetectorProcessor? = null
    private val mHandler = Handler(Looper.getMainLooper())
    var disposable = CompositeDisposable()

    private var isDecoding = false

    private var binding: FragmentCameraMrzBinding? = null

    override fun onAttach(context: Context) {
        super.onAttach(context)
    }

    override fun onCreateView(
        inflater: LayoutInflater, container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View? {
        binding = FragmentCameraMrzBinding.inflate(inflater, container, false)
        return binding?.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
    }

    override fun onResume() {
        // React Native already handles camera permission, so we can proceed directly
        MRZUtil.cleanStorage()
        frameProcessor = textProcessor

        try {
            // Ensure camera view is available
            val cameraView = binding?.cameraPreview
            if (cameraView == null) {
                Log.e(TAG, "Camera view is null, cannot start camera")
                cameraMLKitCallback?.onError(IllegalStateException("Camera view is not available"))
                return
            }

            rotation = getRotation(requireContext(), initialLensPosition)
            buildCamera(cameraView, initialLensPosition)

            // Start the camera since React Native already verified permission
            fotoapparat?.start()
            configureZoom()

        } catch (e: Exception) {
            Log.e(TAG, "Error starting camera", e)
            cameraMLKitCallback?.onError(e)
        }

        // Verify camera startup
        mHandler.postDelayed({
            if (fotoapparat == null) {
                Log.e(TAG, "Camera failed to start")
            }
        }, 1000)
    }

    override fun onPause() {
        // Stop frame processor
        frameProcessor?.stop()
        frameProcessor = null

        // Stop camera properly
        try {
            fotoapparat?.stop()
        } catch (e: Exception) {
            Log.e(TAG, "Error stopping camera", e)
        }

        // Clean up camera reference
        fotoapparat = null
        super.onPause()
    }

    override fun onDestroyView() {
        if (!disposable.isDisposed) {
            disposable.dispose()
        }
        binding = null
        super.onDestroyView()
    }

    override fun onDetach() {
        cameraMLKitCallback = null
        super.onDetach()
    }

    ////////////////////////////////////////////////////////////////////////////////////////
    //
    //        Events from camera fragment
    //
    ////////////////////////////////////////////////////////////////////////////////////////

    override val callbackFrameProcessor: io.fotoapparat.preview.FrameProcessor
        get() {
            val callbackFrameProcessor2 = object : io.fotoapparat.preview.FrameProcessor {
                override fun process(frame: Frame) {
                    try {
                        if (!isDecoding) {
                            isDecoding = true

                            if (frameProcessor != null) {
                                val subscribe = Single.fromCallable {
                                    frameProcessor?.process(
                                        frame = frame,
                                        rotation = rotation,
                                        graphicOverlay = null,
                                        true,
                                        listener = ocrListener
                                    )
                                }.subscribeOn(Schedulers.io())
                                    .observeOn(AndroidSchedulers.mainThread())
                                    .subscribe({ success ->
                                        //Don't do anything

                                    }, { error ->
                                        isDecoding = false
                                        Log.e(TAG, "Frame processing error: $error")
                                        Toast.makeText(
                                            requireContext(),
                                            "Error: " + error,
                                            Toast.LENGTH_SHORT
                                        ).show()
                                    })
                                disposable.add(subscribe)
                            }
                        }
                    } catch (e: Exception) {
                        Log.e(TAG, "Exception in frame processor", e)
                        e.printStackTrace()
                    }

                }
            }
            return callbackFrameProcessor2

        }

    ////////////////////////////////////////////////////////////////////////////////////////
    //
    //        Get camera preview
    //
    ////////////////////////////////////////////////////////////////////////////////////////

    override val cameraPreview: CameraView
        get() {
            val cameraView = binding?.cameraPreview
            if (cameraView == null) {
                Log.e(TAG, "Camera view is null!")
                throw IllegalStateException("Camera view is not available")
            }
            return cameraView
        }

    ////////////////////////////////////////////////////////////////////////////////////////
    //
    //        Permission requested
    //
    ////////////////////////////////////////////////////////////////////////////////////////

    override val requestedPermissions: ArrayList<String>
        get() {
            //Nothing as we don't need any other permission than camera and that's managed in the parent fragment
            return ArrayList<String>()
        }

    override fun onRequestPermissionsResult(
        permissionsDenied: ArrayList<String>,
        permissionsGranted: ArrayList<String>
    ) {
        // No-op - permissions handled by React Native
    }

    ////////////////////////////////////////////////////////////////////////////////////////
    //
    //       Instantiate the text processor to perform OCR
    //
    ////////////////////////////////////////////////////////////////////////////////////////

    //OCR listener
    val ocrListener = object : VisionProcessorBase.Listener<com.google.mlkit.vision.text.Text> {
        override fun onSuccess(
            results: Text,
            frameMetadata: FrameMetadata?,
            timeRequired: Long,
            bitmap: Bitmap?,
            graphicOverlay: GraphicOverlay?
        ) {
            if (!isAdded) {
                return
            }
            OcrUtils.processOcr(
                results = results,
                timeRequired = timeRequired,
                callback = mrzListener
            )
        }

        override fun onCanceled(timeRequired: Long) {
            if (!isAdded) {
                return
            }
        }

        override fun onFailure(
            e: Exception,
            timeRequired: Long
        ) {
            if (!isAdded) {
                return
            }
            Log.e(TAG, "OCR processing failed", e)
            mrzListener.onFailure(e, timeRequired)
        }

        override fun onCompleted(timeRequired: Long) {
            if (!isAdded) {
                return
            }

        }

    }

    //MRZ Listener
    var mrzListener = object : OcrUtils.MRZCallback {
        override fun onMRZRead(mrzInfo: MRZInfo, timeRequired: Long) {
            isDecoding = false
            if (!isAdded) {
                return
            }
            mHandler.post {
                try {
                    binding?.statusViewBottom?.setTextColor(resources.getColor(R.color.status_text))
                    cameraMLKitCallback?.onPassportRead(mrzInfo)

                } catch (e: IllegalStateException) {
                    Log.e(TAG, "Fragment is destroyed", e)
                }
            }
        }

        override fun onMRZReadFailure(timeRequired: Long) {
            isDecoding = false
            if (!isAdded) {
                return
            }
            mHandler.post {
                try {
                    binding?.statusViewTop?.text = ""
                } catch (e: IllegalStateException) {
                    Log.e(TAG, "Fragment is destroyed", e)
                }
            }
        }

        override fun onFailure(e: Exception, timeRequired: Long) {
            isDecoding = false
            if (!isAdded) {
                return
            }
            Log.e(TAG, "MRZ processing failed", e)
            e.printStackTrace()
            mHandler.post {
                cameraMLKitCallback?.onError(e)
            }
        }
    }

    protected val textProcessor: OcrMrzDetectorProcessor
        get() {
            return OcrMrzDetectorProcessor()
        }

    ////////////////////////////////////////////////////////////////////////////////////////
    //
    //        Permissions (No longer needed - handled by React Native)
    //
    ////////////////////////////////////////////////////////////////////////////////////////

    private fun requestCameraPermission() {
        // This method is kept for compatibility but no longer needed
    }

    override fun onRequestPermissionsResult(
        requestCode: Int, permissions: Array<String>,
        grantResults: IntArray
    ) {
        // This method is kept for compatibility but no longer needed
    }

    ////////////////////////////////////////////////////////////////////////////////////////
    //
    //        Dialogs UI
    //
    ////////////////////////////////////////////////////////////////////////////////////////

    /**
     * Shows a [Toast] on the UI thread.
     *
     * @param text The message to show
     */
    private fun showToast(text: String) {
        val activity = activity
        activity?.runOnUiThread { Toast.makeText(activity, text, Toast.LENGTH_SHORT).show() }
    }

    /**
     * Shows an error message dialog.
     */
    class ErrorDialog : androidx.fragment.app.DialogFragment() {

        override fun onCreateDialog(savedInstanceState: Bundle?): Dialog {
            val activity = activity
            return AlertDialog.Builder(activity)
                .setMessage(requireArguments().getString(ARG_MESSAGE))
                .setPositiveButton(android.R.string.ok) { dialogInterface, i -> activity!!.finish() }
                .create()
        }

        companion object {

            private const val ARG_MESSAGE = "message"

            fun newInstance(message: String): ErrorDialog {
                val dialog = ErrorDialog()
                val args = Bundle()
                args.putString(ARG_MESSAGE, message)
                dialog.arguments = args
                return dialog
            }
        }

    }

    /**
     * Shows OK/Cancel confirmation dialog about camera permission.
     */
    class ConfirmationDialog : androidx.fragment.app.DialogFragment() {

        override fun onCreateDialog(savedInstanceState: Bundle?): Dialog {
            val parent = parentFragment
            return AlertDialog.Builder(activity)
                .setMessage(R.string.permission_camera_rationale)
                .setPositiveButton(android.R.string.ok) { dialog, which ->
                    parent!!.requestPermissions(
                        arrayOf(Manifest.permission.CAMERA),
                        REQUEST_CAMERA_PERMISSION
                    )
                }
                .setNegativeButton(android.R.string.cancel
                ) { dialog, which ->
                    val activity = parent!!.activity
                    activity?.finish()
                }
                .create()
        }
    }

    ////////////////////////////////////////////////////////////////////////////////////////
    //
    //        Listener
    //
    ////////////////////////////////////////////////////////////////////////////////////////

    interface CameraMLKitCallback {
        fun onPassportRead(mrzInfo: MRZInfo)
        fun onError(e: Exception)
    }

}
