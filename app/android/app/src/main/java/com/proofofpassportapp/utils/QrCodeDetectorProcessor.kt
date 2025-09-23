// SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11

// Copyright 2018 Google LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
package com.proofofpassportapp.utils


import android.graphics.Bitmap
import android.os.AsyncTask
import android.webkit.URLUtil
import com.google.mlkit.vision.common.InputImage
import com.google.zxing.BinaryBitmap
import com.google.zxing.LuminanceSource
import com.google.zxing.RGBLuminanceSource
import com.google.zxing.Result
import com.google.zxing.common.HybridBinarizer
import com.google.zxing.qrcode.QRCodeReader
import example.jllarraz.com.passportreader.mlkit.FrameMetadata
import example.jllarraz.com.passportreader.utils.ImageUtil
import io.fotoapparat.preview.Frame
import java.nio.ByteBuffer
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors
import java.util.concurrent.atomic.AtomicBoolean


class QrCodeDetectorProcessor {

    // Whether we should ignore process(). This is usually caused by feeding input data faster than
    // the model can handle.
    private val shouldThrottle = AtomicBoolean(false)
    var executor: ExecutorService = Executors.newSingleThreadExecutor()

    fun canHandleNewFrame():Boolean{
        return !shouldThrottle.get()
    }

    fun resetThrottle(){
        shouldThrottle.set(false)
    }

    fun process(
        frame: Frame,
        rotation:Int,
        isOriginalImageReturned:Boolean,
        listener: Listener
    ):Boolean {
        if (shouldThrottle.get()) {
            return false
        }
        shouldThrottle.set(true)
        try{
            val frameMetadata = FrameMetadata.Builder()
                .setWidth(frame.size.width)
                .setHeight(frame.size.height)
                .setRotation(rotation).build()
            val inputImage = InputImage.fromByteArray(frame.image,
                frameMetadata.width,
                frameMetadata.height,
                rotation,
                InputImage.IMAGE_FORMAT_NV21
            )

            var originalBitmap:Bitmap?=null
            try {
                originalBitmap = inputImage.bitmapInternal
                if (originalBitmap == null) {
                    val wrap = ByteBuffer.wrap(frame.image)
                    originalBitmap = ImageUtil.rotateBitmap(ImageUtil.getBitmap(wrap, frameMetadata)!!, frameMetadata.rotation.toFloat())
                }
            }catch (e:Exception){
                e.printStackTrace()
            }

            return detectQrCodeInImage(originalBitmap!!, frameMetadata, if(isOriginalImageReturned) originalBitmap else null, listener)
        }catch (e:Exception){
            e.printStackTrace()
            shouldThrottle.set(false)
            return false
        }
    }

    private fun detectQrCodeInImage(
        image: Bitmap,
        metadata: FrameMetadata?,
        originalBitmap: Bitmap?=null,
        listener: Listener
    ): Boolean {
        val start = System.currentTimeMillis()
        executor.execute {
            val result = detectInImage(image)
            val timeRequired = System.currentTimeMillis() - start
            println(result)
            if (result != null) {
                if (URLUtil.isValidUrl(result.text)) {
                    println("NICO HERE TOO " + result.text)
                    listener.onSuccess(result.text!!, metadata, timeRequired, originalBitmap)
                } else {
                    listener.onFailure(Exception("Invalid URL"), timeRequired)
                }
            }
            else {
                listener.onCompletedFrame(timeRequired)
            }
            shouldThrottle.set(false)
        }

        return true
    }

    private fun detectInImage(bitmap: Bitmap, additionalHints: Map<com.google.zxing.DecodeHintType, Any>? = null): Result? {
        val qRCodeDetectorReader = QRCodeReader()

        // Try with original image first
        var result = tryDetectInBitmap(bitmap, qRCodeDetectorReader, additionalHints)
        if (result != null) return result

        // If original fails, try with scaled up image (better for small QR codes)
        val scaledBitmap = Bitmap.createScaledBitmap(bitmap, bitmap.width * 2, bitmap.height * 2, true)
        result = tryDetectInBitmap(scaledBitmap, qRCodeDetectorReader, additionalHints)
        if (result != null) return result

        // If still fails, try with scaled down image (better for very large QR codes)
        val scaledDownBitmap = Bitmap.createScaledBitmap(bitmap, bitmap.width / 2, bitmap.height / 2, true)
        result = tryDetectInBitmap(scaledDownBitmap, qRCodeDetectorReader, additionalHints)
        if (result != null) return result

        return null
    }

    private fun tryDetectInBitmap(bitmap: Bitmap, qRCodeDetectorReader: QRCodeReader, additionalHints: Map<com.google.zxing.DecodeHintType, Any>? = null): Result? {
        println("Attempting QR detection on bitmap: ${bitmap.width}x${bitmap.height}, hasAlpha: ${bitmap.hasAlpha()}")

        val intArray = IntArray(bitmap.width * bitmap.height)
        bitmap.getPixels(intArray, 0, bitmap.width, 0, 0, bitmap.width, bitmap.height)

        val source: LuminanceSource =
            RGBLuminanceSource(bitmap.width, bitmap.height, intArray)

        // Try multiple binarization strategies for better detection
        val binarizers = listOf(
            HybridBinarizer(source),
            com.google.zxing.common.GlobalHistogramBinarizer(source)
        )

        for (binarizer in binarizers) {
            val binaryBitMap = BinaryBitmap(binarizer)

            try {
                val result = qRCodeDetectorReader.decode(binaryBitMap)
                println("QR Code detected successfully with ${binarizer.javaClass.simpleName}")
                return result
            } catch (e: Exception) {
                println("Detection failed with ${binarizer.javaClass.simpleName}: ${e.message}")
            }
        }

        // Try with different hints for better detection
        val hints = buildMap {
            put(com.google.zxing.DecodeHintType.TRY_HARDER, true)
            put(com.google.zxing.DecodeHintType.POSSIBLE_FORMATS, listOf(com.google.zxing.BarcodeFormat.QR_CODE))
            additionalHints?.forEach { (key, value) -> put(key, value) }
        }

        for (binarizer in binarizers) {
            val binaryBitMap = BinaryBitmap(binarizer)

            try {
                val result = qRCodeDetectorReader.decode(binaryBitMap, hints)
                println("QR Code detected successfully with hints and ${binarizer.javaClass.simpleName}")
                return result
            } catch (e: Exception) {
                println("Detection with hints failed with ${binarizer.javaClass.simpleName}: ${e.message}")
            }
        }

        println("All QR code detection attempts failed for bitmap ${bitmap.width}x${bitmap.height}")
        return null
    }

    fun stop() {
    }

    fun detectQrCodeInBitmap(
        image: Bitmap,
        listener: Listener
    ): Boolean {
        val start = System.currentTimeMillis()
        executor.execute {
            // Added for mAadhar qrcode detection
            val hints = mapOf(
                com.google.zxing.DecodeHintType.PURE_BARCODE to false
            )
            val result = detectInImage(image, hints)
            val timeRequired = System.currentTimeMillis() - start
            println(result)
            if (result != null) {
                listener.onSuccess(result.text!!, null, timeRequired, null)
            }
            else {
                listener.onCompletedFrame(timeRequired)
            }
        }
        return true
    }


    interface Listener {
        fun onSuccess(results: String, frameMetadata: FrameMetadata?, timeRequired: Long, bitmap: Bitmap?)
        fun onFailure(e: Exception, timeRequired:Long)
        fun onCompletedFrame(timeRequired: Long)
    }

    companion object {
        private val TAG = QrCodeDetectorProcessor::class.java.simpleName
    }
}
