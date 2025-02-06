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
    var executor: ExecutorService = Executors.newCachedThreadPool()

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
    ): Boolean {
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
            if (result != null) {
                if (URLUtil.isValidUrl(result.text)) {
                    println("NICO HERE TOO " + result.text)
                    listener.onSuccess(result.text!!, metadata, timeRequired, originalBitmap)
                } else {
                    listener.onFailure(Exception("Invalid URL"), timeRequired)
                    shouldThrottle.set(false)
                }
            }
            else {
                listener.onCompletedFrame(timeRequired)
                shouldThrottle.set(false)
            }
        }

        return true
    }

    private fun detectInImage(bitmap: Bitmap): Result? {
        val qRCodeDetectorReader = QRCodeReader()
        val intArray = IntArray(bitmap.width * bitmap.height)
        bitmap.getPixels(intArray, 0, bitmap.width, 0, 0, bitmap.width, bitmap.height)

        val source: LuminanceSource =
            RGBLuminanceSource(bitmap.width, bitmap.height, intArray)

        val binaryBitMap = BinaryBitmap(HybridBinarizer(source))

        try {
            return qRCodeDetectorReader.decode(binaryBitMap, mapOf(
                com.google.zxing.DecodeHintType.TRY_HARDER to true,
                com.google.zxing.DecodeHintType.POSSIBLE_FORMATS to listOf(com.google.zxing.BarcodeFormat.QR_CODE),
                com.google.zxing.DecodeHintType.CHARACTER_SET to "UTF-8"
            ))
        }
        catch (e: Exception) {
            // noop
            println(e)
        }
        return null
    }

    fun stop() {
        executor.shutdownNow()
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
