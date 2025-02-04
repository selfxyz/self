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
package example.jllarraz.com.passportreader.mlkit

import android.graphics.Bitmap
import android.media.Image

import com.google.android.gms.tasks.Task
import com.google.mlkit.vision.common.InputImage
import example.jllarraz.com.passportreader.utils.ImageUtil
import io.fotoapparat.preview.Frame


import org.jmrtd.lds.icao.MRZInfo

import java.nio.ByteBuffer
import java.util.concurrent.atomic.AtomicBoolean


abstract class VisionProcessorBase<T> : VisionImageProcessor<T> {

    // Whether we should ignore process(). This is usually caused by feeding input data faster than
    // the model can handle.
    private val shouldThrottle = AtomicBoolean(false)

    override fun canHandleNewFrame():Boolean{
        return !shouldThrottle.get()
    }

    override fun resetThrottle(){
        shouldThrottle.set(false)
    }

    override fun process(
        data: ByteBuffer,
        frameMetadata: FrameMetadata,
        graphicOverlay: GraphicOverlay?,
        isOriginalImageReturned:Boolean,
        listener: VisionProcessorBase.Listener<T>):Boolean {
        if (shouldThrottle.get()) {
            return false
        }
        shouldThrottle.set(true)
        try {


            /*val metadata = FirebaseVisionImageMetadata.Builder()
                    .setFormat(FirebaseVisionImageMetadata.IMAGE_FORMAT_NV21)
                    .setWidth(frameMetadata.width)
                    .setHeight(frameMetadata.height)
                    .setRotation(frameMetadata.rotation)
                    .build()*/

            val inputImage = InputImage.fromByteBuffer(data,
                frameMetadata.width,
                frameMetadata.height,
                frameMetadata.rotation,
                InputImage.IMAGE_FORMAT_NV21
            )

            // val firebaseVisionImage = FirebaseVisionImage.fromByteBuffer(data, metadata)
            return detectInVisionImage(
                inputImage,
                frameMetadata,
                graphicOverlay,
                if (isOriginalImageReturned) inputImage.bitmapInternal else null,
                listener)
        }catch (e:Exception){
            e.printStackTrace()
            shouldThrottle.set(false)
            return false
        }
    }


    // Bitmap version
    override fun process(frame: Frame,
                         rotation:Int,
                         graphicOverlay: GraphicOverlay?,
                         isOriginalImageReturned:Boolean,
                         listener: VisionProcessorBase.Listener<T>):Boolean {
        if (shouldThrottle.get()) {
            return false
        }
        shouldThrottle.set(true)
        try{
            /* var intFirebaseRotation=FirebaseVisionImageMetadata.ROTATION_0
             when(rotation){
                 0 ->{
                     intFirebaseRotation = FirebaseVisionImageMetadata.ROTATION_0
                 }
                 90 ->{
                     intFirebaseRotation = FirebaseVisionImageMetadata.ROTATION_90
                 }
                 180 ->{
                     intFirebaseRotation = FirebaseVisionImageMetadata.ROTATION_180
                 }
                 270 ->{
                     intFirebaseRotation = FirebaseVisionImageMetadata.ROTATION_270
                 }
             }*/


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
            if(isOriginalImageReturned){
                try {
                    originalBitmap = inputImage.bitmapInternal
                    if (originalBitmap == null) {
                        val wrap = ByteBuffer.wrap(frame.image)
                        originalBitmap = ImageUtil.rotateBitmap(ImageUtil.getBitmap(wrap, frameMetadata)!!, frameMetadata.rotation.toFloat())
                    }
                }catch (e:Exception){
                    e.printStackTrace()
                }
            }

            // val firebaseVisionImage = FirebaseVisionImage.fromByteArray(frame.image, metadata)
            return detectInVisionImage(inputImage, frameMetadata, graphicOverlay, if(isOriginalImageReturned) originalBitmap else null, listener)
        }catch (e:Exception){
            e.printStackTrace()
            shouldThrottle.set(false)
            return false
        }
    }


    // Bitmap version
    override fun process(bitmap: Bitmap, rotation: Int, graphicOverlay: GraphicOverlay?, isOriginalImageReturned:Boolean, convertToNv21:Boolean, listener: VisionProcessorBase.Listener<T>):Boolean {
        if (shouldThrottle.get()) {
            return false
        }
        try{
            val bitmapToProcess:Bitmap?
            when(rotation){
                0 -> {
                    bitmapToProcess = bitmap
                }
                else  -> {
                    bitmapToProcess = ImageUtil.rotateBitmap(bitmap, rotation.toFloat())
                }
            }

            val frameMetadata = FrameMetadata.Builder()
                .setWidth(bitmapToProcess.width)
                .setHeight(bitmapToProcess.height)
                .setRotation(rotation).build()


            /*var byteArray:ByteArray
            if(convertToNv21){
                byteArray = ImageUtil.toNv21(bitmapToProcess)
            } else {
                val size = bitmapToProcess.rowBytes * bitmapToProcess.height
                val byteBuffer = ByteBuffer.allocate(size)
                bitmapToProcess.copyPixelsToBuffer(byteBuffer)
                byteArray = byteBuffer.array()
            }
            bitmapToProcess.recycle()
            val byteBuffer = ByteBuffer.wrap(byteArray)*/

            val inputImage = InputImage.fromBitmap(bitmapToProcess, rotation)

            // val fromBitmap = FirebaseVisionImage.fromBitmap(bitmapToProcess)

            return process(inputImage, frameMetadata, graphicOverlay, isOriginalImageReturned, listener)
        }catch (e:Exception){
            e.printStackTrace()
            shouldThrottle.set(false)
            return false
        }
    }



    /**
     * Detects feature from given media.Image
     *
     * @return created FirebaseVisionImage
     */
    override fun process(image: Image, rotation: Int, graphicOverlay: GraphicOverlay?, isOriginalImageReturned:Boolean, listener: Listener<T>):Boolean {
        if (shouldThrottle.get()) {
            return false
        }
        shouldThrottle.set(true)
        try {
            // This is for overlay display's usage
            val frameMetadata = FrameMetadata.Builder().setWidth(image.width).setHeight(image.height).build()
            val inputImage = InputImage.fromMediaImage(image, rotation)
            //val fbVisionImage = FirebaseVisionImage.fromMediaImage(image, rotation)

            return detectInVisionImage(inputImage, frameMetadata, graphicOverlay, if (isOriginalImageReturned) inputImage.bitmapInternal else null, listener)
        }catch (e:Exception){
            e.printStackTrace()
            shouldThrottle.set(false)
            return false
        }
    }

    private fun detectInVisionImage(
        image: InputImage,
        metadata: FrameMetadata?,
        graphicOverlay: GraphicOverlay?,
        originalBitmap: Bitmap?=null,
        listener: Listener<T>
    ):Boolean {
        val start = System.currentTimeMillis()
        // val bitmapForDebugging = image.bitmap
        detectInImage(image)
            .addOnSuccessListener { results ->
                val timeRequired = System.currentTimeMillis() - start
                listener.onSuccess(results, metadata, timeRequired, originalBitmap, graphicOverlay)
            }
            .addOnFailureListener { e ->
                val timeRequired = System.currentTimeMillis() - start
                listener.onFailure(e, timeRequired)
                shouldThrottle.set(false)
            }
            .addOnCanceledListener {
                val timeRequired = System.currentTimeMillis() - start
                listener.onCanceled(timeRequired)
                shouldThrottle.set(false)
            }
            .addOnCompleteListener {
                val timeRequired = System.currentTimeMillis() - start
                listener.onCompleted(timeRequired)
                shouldThrottle.set(false)
            }
        // Begin throttling until this frame of input has been processed, either in onSuccess or
        // onFailure.

        return true
    }

    override fun process(image: InputImage, metadata: FrameMetadata?, graphicOverlay: GraphicOverlay?, isOriginalImageReturned:Boolean, listener: Listener<T>):Boolean{
        if (shouldThrottle.get()) {
            return false
        }
        shouldThrottle.set(true)
        try {
            return detectInVisionImage(image, metadata, graphicOverlay, if (isOriginalImageReturned) image.bitmapInternal else null, listener)
        }catch (e:Exception){
            e.printStackTrace()
            shouldThrottle.set(false)
            return false
        }
    }

    override fun stop() {}

    protected abstract fun detectInImage(image: InputImage): Task<T>


    interface Listener<T> {
        fun onSuccess(results: T, frameMetadata: FrameMetadata?, timeRequired: Long, bitmap: Bitmap?, graphicOverlay: GraphicOverlay?=null)
        fun onCanceled(timeRequired:Long)
        fun onFailure(e: Exception, timeRequired:Long)
        fun onCompleted(timeRequired:Long)
    }

    companion object {

        private val TAG = VisionProcessorBase::class.java.simpleName
    }
}
