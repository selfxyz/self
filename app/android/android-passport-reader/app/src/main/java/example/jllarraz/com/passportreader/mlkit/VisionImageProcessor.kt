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

import com.google.mlkit.vision.common.InputImage
import io.fotoapparat.preview.Frame

import java.nio.ByteBuffer

/** An inferface to process the images with different ML Kit detectors and custom image models.  */
interface VisionImageProcessor<T> {

    /** Processes the images with the underlying machine learning models.  */
    fun process(data: ByteBuffer, frameMetadata: FrameMetadata, graphicOverlay: GraphicOverlay?=null, isOriginalImageReturned:Boolean = true, listener: VisionProcessorBase.Listener<T>):Boolean

    /** Processes the bitmap images.  */
    fun process(bitmap: Bitmap, rotation: Int = 0, graphicOverlay: GraphicOverlay?=null, isOriginalImageReturned:Boolean = true, convertToNv21:Boolean = true, listener: VisionProcessorBase.Listener<T>):Boolean

    /** Processes the images.  */
    fun process(image: Image, rotation: Int = 0, graphicOverlay: GraphicOverlay?=null, isOriginalImageReturned:Boolean = true, listener: VisionProcessorBase.Listener<T>):Boolean

    /** Processes the bitmap images.  */
    fun process(frame: Frame, rotation:Int = 0, graphicOverlay: GraphicOverlay?=null, isOriginalImageReturned:Boolean = true, listener: VisionProcessorBase.Listener<T>):Boolean

    /** Processes the FirebaseVisionImage  */
    fun process(image: InputImage, metadata: FrameMetadata?, graphicOverlay: GraphicOverlay?, isOriginalImageReturned:Boolean = true, listener: VisionProcessorBase.Listener<T>):Boolean

    /** Stops the underlying machine learning model and release resources.  */
    fun stop()

    fun canHandleNewFrame():Boolean

    fun resetThrottle()
}
