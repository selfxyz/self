// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

package com.proofofpassportapp.utils

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.ImageFormat
import android.graphics.Matrix
import android.graphics.Rect
import android.graphics.YuvImage
import android.media.Image
import android.util.Log
import androidx.annotation.Nullable
import com.proofofpassportapp.mlkit.FrameMetadata
import java.io.ByteArrayInputStream
import java.io.ByteArrayOutputStream
import java.io.DataInputStream
import java.io.IOException
import java.io.InputStream
import java.nio.ByteBuffer
import org.jmrtd.jj2000.JJ2000Decoder
import org.jmrtd.lds.ImageInfo.WSQ_MIME_TYPE
import org.jnbis.internal.WsqDecoder

object ImageUtil {

    private const val TAG = "ImageUtil"

    var JPEG_MIME_TYPE = "image/jpeg"
    var JPEG2000_MIME_TYPE = "image/jp2"
    var JPEG2000_ALT_MIME_TYPE = "image/jpeg2000"
    var WSQ_MIME_TYPE = "image/x-wsq"

    fun imageToByteArray(image: Image): ByteArray? {
        var data: ByteArray? = null
        if (image.format == ImageFormat.JPEG) {
            val planes = image.planes
            val buffer = planes[0].buffer
            data = ByteArray(buffer.capacity())
            buffer.get(data)
            return data
        } else if (image.format == ImageFormat.YUV_420_888) {
            data = NV21toJPEG(
                YUV_420_888toNV21(image),
                image.width,
                image.height
            )
        }
        return data
    }

    fun YUV_420_888toNV21(image: Image): ByteArray {
        val yBuffer = image.planes[0].buffer
        val uBuffer = image.planes[1].buffer
        val vBuffer = image.planes[2].buffer

        val ySize = yBuffer.remaining()
        val uSize = uBuffer.remaining()
        val vSize = vBuffer.remaining()

        val nv21 = ByteArray(ySize + uSize + vSize)

        // U and V are swapped
        yBuffer.get(nv21, 0, ySize)
        vBuffer.get(nv21, ySize, vSize)
        uBuffer.get(nv21, ySize + vSize, uSize)

        return nv21
    }

    private fun NV21toJPEG(nv21: ByteArray, width: Int, height: Int): ByteArray {
        val out = ByteArrayOutputStream()
        val yuv = YuvImage(nv21, ImageFormat.NV21, width, height, null)
        yuv.compressToJpeg(Rect(0, 0, width, height), 100, out)
        return out.toByteArray()
    }

    /* IMAGE DECODIFICATION METHODS */

    @Throws(IOException::class)
    fun decodeImage(inputStream: InputStream, imageLength: Int, mimeType: String): Bitmap {
        var decodingStream = inputStream
        /* DEBUG */
        synchronized(decodingStream) {
            val dataIn = DataInputStream(decodingStream)
            val bytes = ByteArray(imageLength)
            dataIn.readFully(bytes)
            decodingStream = ByteArrayInputStream(bytes)
        }
        /* END DEBUG */

        return when {
            JPEG2000_MIME_TYPE.equals(mimeType, ignoreCase = true) ||
                JPEG2000_ALT_MIME_TYPE.equals(mimeType, ignoreCase = true) -> {
                val bitmap = JJ2000Decoder.decode(decodingStream)
                toAndroidBitmap(bitmap)
            }

            WSQ_MIME_TYPE.equals(mimeType, ignoreCase = true) -> {
                val wsqDecoder = WsqDecoder()
                val wsqBitmap = wsqDecoder.decode(decodingStream.readBytes())
                val byteData = wsqBitmap.pixels
                val intData = IntArray(byteData.size)
                for (index in byteData.indices) {
                    val value = byteData[index].toInt() and 0xFF
                    intData[index] = -0x1000000 or (value shl 16) or (value shl 8) or value
                }
                Bitmap.createBitmap(
                    intData,
                    0,
                    wsqBitmap.width,
                    wsqBitmap.width,
                    wsqBitmap.height,
                    Bitmap.Config.ARGB_8888
                )
            }

            else -> BitmapFactory.decodeStream(decodingStream)
        }
    }

    fun rotateBitmap(source: Bitmap, angle: Float): Bitmap {
        val matrix = Matrix()
        matrix.postRotate(angle)
        return Bitmap.createBitmap(source, 0, 0, source.width, source.height, matrix, true)
    }

    // Convert NV21 format byte buffer to bitmap.
    @Nullable
    fun getBitmap(data: ByteBuffer, metadata: FrameMetadata): Bitmap? {
        data.rewind()
        val imageInBuffer = ByteArray(data.limit())
        data.get(imageInBuffer, 0, imageInBuffer.size)
        return try {
            val image = YuvImage(
                imageInBuffer,
                ImageFormat.NV21,
                metadata.width,
                metadata.height,
                null
            )
            if (image != null) {
                val stream = ByteArrayOutputStream()
                image.compressToJpeg(Rect(0, 0, metadata.width, metadata.height), 80, stream)

                val bmp = BitmapFactory.decodeByteArray(stream.toByteArray(), 0, stream.size())

                stream.close()
                rotateBitmap(bmp, metadata.rotation.toFloat())
            } else {
                null
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error: ${'$'}{e.message}")
            null
        }
    }

    /* ONLY PRIVATE METHODS BELOW */

    private fun toAndroidBitmap(bitmap: org.jmrtd.jj2000.Bitmap): Bitmap {
        val intData = bitmap.pixels
        return Bitmap.createBitmap(intData, 0, bitmap.width, bitmap.width, bitmap.height, Bitmap.Config.ARGB_8888)
    }
}
