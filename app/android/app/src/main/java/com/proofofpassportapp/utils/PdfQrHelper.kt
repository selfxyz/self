// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.
package com.proofofpassportapp.utils

import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.util.Log
import com.google.android.gms.tasks.Tasks
import com.google.mlkit.vision.barcode.BarcodeScanner
import com.google.mlkit.vision.barcode.BarcodeScannerOptions
import com.google.mlkit.vision.barcode.BarcodeScanning
import com.google.mlkit.vision.barcode.common.Barcode
import com.google.mlkit.vision.common.InputImage
import com.tom_roush.pdfbox.pdmodel.PDDocument
import com.tom_roush.pdfbox.rendering.PDFRenderer

/**
 * Rasterizes an (already decrypted) e-Aadhaar PDF and locates the Secure QR code.
 *
 * The Secure QR is dense and embedded in a cluttered page (text, logos, a second
 * QR), and its placement varies across e-Aadhaar formats. ZXing's single-symbol
 * reader can't localize a QR inside a busy page, so we use ML Kit's barcode
 * detector (which localizes and decodes anywhere in the image) on the high-DPI
 * page, then fall back to ZXing on an overlapping tile grid.
 */
object PdfQrHelper {
    private const val TARGET_DPI = 500f
    private const val FALLBACK_DPI = 350f

    // Overlapping tile grid (normalized starts; each tile is TILE_SIZE wide/tall).
    private val TILE_STARTS = floatArrayOf(0.0f, 0.3f, 0.6f)
    private const val TILE_SIZE = 0.4f

    fun findQr(
        document: PDDocument,
        processor: QrCodeDetectorProcessor,
    ): String? {
        val pageCount = document.numberOfPages
        if (pageCount <= 0) return null

        val renderer = PDFRenderer(document)
        val lastIndex = pageCount - 1
        val pages = if (lastIndex == 0) intArrayOf(0) else intArrayOf(0, lastIndex)

        val scanner = BarcodeScanning.getClient(
            BarcodeScannerOptions.Builder()
                .setBarcodeFormats(Barcode.FORMAT_QR_CODE)
                .build(),
        )
        try {
            for (pageIndex in pages) {
                val page = renderFullPage(renderer, document, pageIndex, TARGET_DPI)
                    ?: renderFullPage(renderer, document, pageIndex, FALLBACK_DPI)
                    ?: continue
                try {
                    // 1) ML Kit on the whole page (localizes the QR in clutter).
                    decodeMlKit(scanner, page)?.let {
                        Log.d(TAG, "mlkit full-page page=$pageIndex -> HIT")
                        return it
                    }

                    // 2) ML Kit + ZXing on overlapping tiles as a fallback.
                    val w = page.width
                    val h = page.height
                    for (sy in TILE_STARTS) {
                        for (sx in TILE_STARTS) {
                            val left = (sx * w).toInt().coerceIn(0, w - 1)
                            val top = (sy * h).toInt().coerceIn(0, h - 1)
                            val right = ((sx + TILE_SIZE) * w).toInt().coerceIn(left + 1, w)
                            val bottom = ((sy + TILE_SIZE) * h).toInt().coerceIn(top + 1, h)
                            val tile = Bitmap.createBitmap(page, left, top, right - left, bottom - top)
                            try {
                                decodeMlKit(scanner, tile)?.let {
                                    Log.d(TAG, "mlkit tile page=$pageIndex tile=($sx,$sy) -> HIT")
                                    return it
                                }
                                processor.decodeBitmapDirect(tile)?.let {
                                    Log.d(TAG, "zxing tile page=$pageIndex tile=($sx,$sy) -> HIT")
                                    return it
                                }
                            } finally {
                                if (tile != page) tile.recycle()
                            }
                        }
                    }
                    Log.d(TAG, "page=$pageIndex -> all miss")
                } finally {
                    if (!page.isRecycled) page.recycle()
                }
            }
        } finally {
            scanner.close()
        }
        return null
    }

    private fun decodeMlKit(scanner: BarcodeScanner, bitmap: Bitmap): String? {
        return try {
            val image = InputImage.fromBitmap(bitmap, 0)
            val barcodes = Tasks.await(scanner.process(image))
            val values = barcodes.mapNotNull { it.rawValue }
            // Prefer the Aadhaar secure QR (long numeric string).
            values.firstOrNull { it.length >= 100 && it.all(Char::isDigit) }
                ?: values.firstOrNull()
        } catch (e: Exception) {
            Log.d(TAG, "mlkit decode err: ${e.message}")
            null
        }
    }

    /**
     * Renders a full page to a RGB_565 bitmap at the given DPI. RGB_565 halves
     * memory vs ARGB_8888 (QR is monochrome, so no quality loss for decoding).
     * Returns null on OutOfMemoryError so the caller can retry at a lower DPI.
     */
    private fun renderFullPage(
        renderer: PDFRenderer,
        document: PDDocument,
        pageIndex: Int,
        dpi: Float,
    ): Bitmap? {
        return try {
            val box = document.getPage(pageIndex).cropBox
            val scale = dpi / 72f
            val w = Math.round(box.width * scale)
            val h = Math.round(box.height * scale)
            val bmp = Bitmap.createBitmap(w, h, Bitmap.Config.RGB_565)
            val canvas = Canvas(bmp)
            canvas.drawColor(Color.WHITE)
            renderer.renderPageToGraphics(pageIndex, Paint(), canvas, scale)
            bmp
        } catch (e: OutOfMemoryError) {
            Log.d(TAG, "render page $pageIndex @ ${dpi}dpi OOM: ${e.message}")
            null
        } catch (e: Exception) {
            Log.d(TAG, "render page $pageIndex @ ${dpi}dpi failed: ${e.message}")
            null
        }
    }

    private const val TAG = "AadhaarPdf"
}
