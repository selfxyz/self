package example.jllarraz.com.passportreader.utils

import android.content.Context
import android.graphics.*
import android.media.Image
import android.util.Log
import androidx.annotation.Nullable
import example.jllarraz.com.passportreader.mlkit.FrameMetadata

import org.jnbis.internal.WsqDecoder

import java.io.BufferedInputStream
import java.io.ByteArrayInputStream
import java.io.ByteArrayOutputStream
import java.io.DataInputStream
import java.io.File
import java.io.FileInputStream
import java.io.FileOutputStream
import java.io.IOException
import java.io.InputStream
import java.io.OutputStream
import java.nio.ByteBuffer

import jj2000.j2k.decoder.Decoder
import jj2000.j2k.util.ParameterList


import org.jmrtd.lds.ImageInfo.WSQ_MIME_TYPE
import kotlin.experimental.and

object ImageUtil {

    private val TAG = ImageUtil::class.java.simpleName

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
                    image.width, image.height)
        }
        return data
    }

    fun YUV_420_888toNV21(image: Image): ByteArray {
        val nv21: ByteArray
        val yBuffer = image.planes[0].buffer
        val uBuffer = image.planes[1].buffer
        val vBuffer = image.planes[2].buffer

        val ySize = yBuffer.remaining()
        val uSize = uBuffer.remaining()
        val vSize = vBuffer.remaining()

        nv21 = ByteArray(ySize + uSize + vSize)

        //U and V are swapped
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
        var inputStream = inputStream
        /* DEBUG */
        synchronized(inputStream) {
            val dataIn = DataInputStream(inputStream)
            val bytes = ByteArray(imageLength)
            dataIn.readFully(bytes)
            inputStream = ByteArrayInputStream(bytes)
        }
        /* END DEBUG */

        if (JPEG2000_MIME_TYPE.equals(mimeType, ignoreCase = true) || JPEG2000_ALT_MIME_TYPE.equals(mimeType, ignoreCase = true)) {
            val bitmap = org.jmrtd.jj2000.JJ2000Decoder.decode(inputStream)
            return toAndroidBitmap(bitmap)
        } else if (WSQ_MIME_TYPE.equals(mimeType, ignoreCase = true)) {
            //org.jnbis.Bitmap bitmap = WSQDecoder.decode(inputStream);
            val wsqDecoder = WsqDecoder()
            val bitmap = wsqDecoder.decode(inputStream.readBytes())
            val byteData = bitmap.pixels
            val intData = IntArray(byteData.size)
            for (j in byteData.indices) {
                intData[j] = -0x1000000 or ((byteData[j].toInt() and 0xFF) shl 16) or ((byteData[j].toInt() and 0xFF) shl 8) or (byteData[j].toInt() and 0xFF)
            }
            return Bitmap.createBitmap(intData, 0, bitmap.width, bitmap.width, bitmap.height, Bitmap.Config.ARGB_8888)
            //return toAndroidBitmap(bitmap);
        } else {
            return BitmapFactory.decodeStream(inputStream)
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
        try {
            val image = YuvImage(
                imageInBuffer, ImageFormat.NV21, metadata.width, metadata.height, null
            )
            if (image != null) {
                val stream = ByteArrayOutputStream()
                image.compressToJpeg(Rect(0, 0, metadata.width, metadata.height), 80, stream)

                val bmp = BitmapFactory.decodeByteArray(stream.toByteArray(), 0, stream.size())

                stream.close()
                return rotateBitmap(bmp, metadata.rotation.toFloat())
            }
        } catch (e: Exception) {
            Log.e("VisionProcessorBase", "Error: " + e.message)
        }

        return null
    }

    /* ONLY PRIVATE METHODS BELOW */

    private fun toAndroidBitmap(bitmap: org.jmrtd.jj2000.Bitmap): Bitmap {
        val intData = bitmap.pixels
        return Bitmap.createBitmap(intData, 0, bitmap.width, bitmap.width, bitmap.height, Bitmap.Config.ARGB_8888)

    }
}