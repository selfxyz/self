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
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Toast
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.doOnAttach
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

//    private lateinit var customView: CustomView

    ////////////////////////////////////////

    private var cameraMLKitCallback: CameraMLKitCallback? = cameraMLKitCallback
    private var frameProcessor: OcrMrzDetectorProcessor? = null
    private val mHandler = Handler(Looper.getMainLooper())
    var disposable = CompositeDisposable()

    private var isDecoding = false

    private var binding:FragmentCameraMrzBinding?=null

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?,
                              savedInstanceState: Bundle?): View? {
        binding = FragmentCameraMrzBinding.inflate(inflater, container, false)
        return binding?.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        val fragmentBinding = binding ?: return
        val statusTop = fragmentBinding.statusViewTop
        val statusBottom = fragmentBinding.statusViewBottom
        val initialTopStart = ViewCompat.getPaddingStart(statusTop)
        val initialTopPadding = statusTop.paddingTop
        val initialTopEnd = ViewCompat.getPaddingEnd(statusTop)
        val initialTopBottom = statusTop.paddingBottom
        val initialBottomStart = ViewCompat.getPaddingStart(statusBottom)
        val initialBottomTop = statusBottom.paddingTop
        val initialBottomEnd = ViewCompat.getPaddingEnd(statusBottom)
        val initialBottomPadding = statusBottom.paddingBottom

        ViewCompat.setOnApplyWindowInsetsListener(fragmentBinding.root) { _, insets ->
            val statusInsets = insets.getInsets(
                WindowInsetsCompat.Type.statusBars() or WindowInsetsCompat.Type.displayCutout()
            )
            ViewCompat.setPaddingRelative(
                statusTop,
                initialTopStart,
                initialTopPadding + statusInsets.top,
                initialTopEnd,
                initialTopBottom
            )

            val navAndGesturesInsets = insets.getInsets(
                WindowInsetsCompat.Type.navigationBars() or WindowInsetsCompat.Type.systemGestures()
            )
            val imeInsets = insets.getInsets(WindowInsetsCompat.Type.ime())
            val bottomInset = maxOf(navAndGesturesInsets.bottom, imeInsets.bottom)
            ViewCompat.setPaddingRelative(
                statusBottom,
                initialBottomStart,
                initialBottomTop,
                initialBottomEnd,
                initialBottomPadding + bottomInset
            )

            insets
        }

        fragmentBinding.root.doOnAttach { ViewCompat.requestApplyInsets(it) }
    }


    override fun onResume() {
        MRZUtil.cleanStorage()
        frameProcessor = textProcessor
        super.onResume()
    }



    override fun onPause() {
        frameProcessor?.stop()
        frameProcessor = null

        super.onPause()
    }

    override fun onDestroyView() {
        binding?.root?.let { ViewCompat.setOnApplyWindowInsetsListener(it, null) }
        if (!disposable.isDisposed()) {
            disposable.dispose();
        }
        binding = null
        super.onDestroyView()
//        customView.onDestroy()
    }

    override fun onAttach(context: Context) {
        super.onAttach(context)
//        val activity = activity
//        if (activity is CameraMLKitCallback) {
//            cameraMLKitCallback = activity
//        }
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
                                val subscribe = Single.fromCallable({
                                    frameProcessor?.process(
                                        frame = frame,
                                        rotation = rotation,
                                        graphicOverlay = null,
                                        true,
                                        listener = ocrListener
                                    )
                                }).subscribeOn(Schedulers.io())
                                    .observeOn(AndroidSchedulers.mainThread())
                                    .subscribe({ success ->
                                        //Don't do anything

                                    },{error->
                                        isDecoding = false
                                        Toast.makeText(requireContext(), "Error: "+error, Toast.LENGTH_SHORT).show()
                                    })
                                disposable.add(subscribe)
                            }
                        }
                    }catch (e:Exception){
                        e.printStackTrace()
                    }

                }
            }
            return  callbackFrameProcessor2

        }

    ////////////////////////////////////////////////////////////////////////////////////////
    //
    //        Get camera preview
    //
    ////////////////////////////////////////////////////////////////////////////////////////

    override val cameraPreview: CameraView
        get(){
            return binding?.cameraPreview!!
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

    override fun onRequestPermissionsResult(permissionsDenied: ArrayList<String>, permissionsGranted: ArrayList<String>) {
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
            if(!isAdded){
                return
            }
            mHandler.post {
                try {

//                    binding?.statusViewTop?.text = getString(R.string.status_bar_ocr, mrzInfo.documentNumber, mrzInfo.dateOfBirth, mrzInfo.dateOfExpiry)
//                    binding?.statusViewBottom?.text = getString(R.string.status_bar_success, timeRequired)
                    binding?.statusViewBottom?.setTextColor(resources.getColor(R.color.status_text))
                    cameraMLKitCallback.onPassportRead(mrzInfo)

                } catch (e: IllegalStateException) {
                    //The fragment is destroyed
                }
            }
        }

        override fun onMRZReadFailure(timeRequired: Long) {
            isDecoding = false
            if(!isAdded){
                return
            }
            mHandler.post {
                try {
//                    binding?.statusViewBottom?.text = getString(R.string.status_bar_failure, timeRequired)
//                    binding?.statusViewBottom?.setTextColor(Color.RED)
                    binding?.statusViewTop?.text = ""
                } catch (e: IllegalStateException) {
                    //The fragment is destroyed
                }
            }
        }

        override fun onFailure(e: Exception, timeRequired: Long) {
            isDecoding = false
            if(!isAdded){
                return
            }
            e.printStackTrace()
            mHandler.post {
                cameraMLKitCallback.onError(e)
            }
        }
    }




    protected val textProcessor: OcrMrzDetectorProcessor
        get() = OcrMrzDetectorProcessor()



    ////////////////////////////////////////////////////////////////////////////////////////
    //
    //        Permissions
    //
    ////////////////////////////////////////////////////////////////////////////////////////

    private fun requestCameraPermission() {
        if (shouldShowRequestPermissionRationale(Manifest.permission.CAMERA)) {
            ConfirmationDialog().show(childFragmentManager, FRAGMENT_DIALOG)
        } else {
            requestPermissions(arrayOf(Manifest.permission.CAMERA), REQUEST_CAMERA_PERMISSION)
        }
    }

    override fun onRequestPermissionsResult(requestCode: Int, permissions: Array<String>,
                                            grantResults: IntArray) {
        if (requestCode == REQUEST_CAMERA_PERMISSION) {
            if (grantResults.size != 1 || grantResults[0] != PackageManager.PERMISSION_GRANTED) {
                ErrorDialog.newInstance(getString(R.string.permission_camera_rationale))
                    .show(childFragmentManager, FRAGMENT_DIALOG)
            }
        } else {
            super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        }
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

            private val ARG_MESSAGE = "message"

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
                    parent!!.requestPermissions(arrayOf(Manifest.permission.CAMERA),
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

    companion object {

        /**
         * Tag for the [Log].
         */
        private val TAG = CameraMLKitFragment::class.java.simpleName

        private val REQUEST_CAMERA_PERMISSION = 1
        private val FRAGMENT_DIALOG = "CameraMLKitFragment"
    }


}
