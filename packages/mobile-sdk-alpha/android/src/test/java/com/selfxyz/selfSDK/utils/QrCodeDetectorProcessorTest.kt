// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

package com.selfxyz.selfSDK.utils

import android.graphics.Bitmap
import com.google.zxing.BarcodeFormat
import com.google.zxing.Result
import com.google.zxing.ResultPoint
import com.selfxyz.selfSDK.mlkit.FrameMetadata
import java.util.concurrent.atomic.AtomicReference
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class QrCodeDetectorProcessorTest {

    @Test
    fun `self scheme payload triggers listener success`() {
        val processor = QrCodeDetectorProcessor()
        val receivedResult = AtomicReference<String?>()
        val receivedFailure = AtomicReference<Exception?>()
        val listener = object : QrCodeDetectorProcessor.Listener {
            override fun onSuccess(results: String, frameMetadata: FrameMetadata?, timeRequired: Long, bitmap: Bitmap?) {
                receivedResult.set(results)
            }

            override fun onFailure(e: Exception, timeRequired: Long) {
                receivedFailure.set(e)
            }

            override fun onCompletedFrame(timeRequired: Long) {
                // no-op for this test
            }
        }

        val result = Result(
            "self://ok",
            ByteArray(0),
            emptyArray<ResultPoint>(),
            BarcodeFormat.QR_CODE,
        )

        processor.handleDetectionResult(result, null, null, listener, 12L)

        assertEquals("self://ok", receivedResult.get())
        assertNull("Expected no failure to be emitted", receivedFailure.get())
        assertTrue("Listener should not remain unset", receivedResult.get() != null)
    }
}
