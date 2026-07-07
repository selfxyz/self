// SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11

package com.proofofpassportapp.ui

import android.content.Context
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.graphics.Color
import android.hardware.camera2.CameraCharacteristics
import android.os.Handler
import android.os.Looper
import android.util.Log
import android.view.LayoutInflater
import android.view.MotionEvent
import android.view.Surface
import android.view.WindowManager
import android.widget.FrameLayout
import androidx.core.content.ContextCompat
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReactContext
import com.facebook.react.uimanager.UIManagerHelper
import com.facebook.react.uimanager.events.Event
import com.google.mlkit.vision.text.Text
import com.proofofpassportapp.BuildConfig
import example.jllarraz.com.passportreader.R
import example.jllarraz.com.passportreader.databinding.FragmentCameraMrzBinding
import example.jllarraz.com.passportreader.mlkit.FrameMetadata
import example.jllarraz.com.passportreader.mlkit.GraphicOverlay
import example.jllarraz.com.passportreader.mlkit.OcrMrzDetectorProcessor
import example.jllarraz.com.passportreader.mlkit.VisionProcessorBase
import example.jllarraz.com.passportreader.tesseract.TesseractMrzProcessor
import example.jllarraz.com.passportreader.utils.MRZUtil
import example.jllarraz.com.passportreader.utils.OcrUtils
import io.fotoapparat.Fotoapparat
import io.fotoapparat.characteristic.LensPosition
import io.fotoapparat.configuration.CameraConfiguration
import io.fotoapparat.parameter.Zoom
import io.fotoapparat.preview.Frame
import io.fotoapparat.preview.FrameProcessor
import io.fotoapparat.selector.autoFocus
import io.fotoapparat.selector.firstAvailable
import io.fotoapparat.selector.off
import io.fotoapparat.view.CameraView
import io.reactivex.Completable
import io.reactivex.Single
import io.reactivex.android.schedulers.AndroidSchedulers
import io.reactivex.disposables.CompositeDisposable
import io.reactivex.schedulers.Schedulers
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicBoolean

class PassportCameraView(context: Context) : FrameLayout(context) {
  private val binding =
      FragmentCameraMrzBinding.inflate(LayoutInflater.from(context), this, true)
  private val mainHandler = Handler(Looper.getMainLooper())
  private var frameProcessor: OcrMrzDetectorProcessor? = null
  private var disposable = CompositeDisposable()
  private var fotoapparat: Fotoapparat? = null
  private var cameraZoom: Zoom.VariableZoom? = null
  private var zoomProgress: Int = 0
  private var mounted = false
  private var cameraStarted = false
  private val isDecoding = AtomicBoolean(false)
  private val passportDispatched = AtomicBoolean(false)
  // isDecoding is force-reset by ocrListener.onCompleted after every ML Kit pass, so the
  // Tesseract fallback needs its own gate to keep the loop one-frame-at-a-time.
  private val tesseractInFlight = AtomicBoolean(false)
  private var tesseractProcessor: TesseractMrzProcessor? = null
  private var rotation: Int = 0
  private var mDist: Float = 0f

  var configuration =
      CameraConfiguration(
          focusMode = firstAvailable(autoFocus()),
          flashMode = off(),
      )

  init {
    binding.root.setBackgroundColor(Color.BLACK)
  }

  fun setMounted(value: Boolean) {
    mounted = value
    syncCameraState()
  }

  fun stopCamera() {
    mounted = false
    releaseCamera()
  }

  override fun onAttachedToWindow() {
    super.onAttachedToWindow()
    syncCameraState()
  }

  override fun onDetachedFromWindow() {
    releaseCamera()
    super.onDetachedFromWindow()
  }

  private fun syncCameraState() {
    if (!mounted || !isAttachedToWindow) {
      releaseCamera()
      return
    }

    if (!hasCameraPermission()) {
      dispatchError(
          IllegalStateException("Camera permission denied"),
          "This application cannot run because it does not have the camera permission. The application will now exit.",
      )
      return
    }

    if (cameraStarted) {
      return
    }

    MRZUtil.cleanStorage()
    frameProcessor = textProcessor
    if (BuildConfig.TESSERACT_MRZ_FALLBACK && tesseractProcessor == null) {
      val processor = TesseractMrzProcessor(context)
      tesseractProcessor = processor
      disposable.add(
          Completable.fromAction { processor.warmUp() }
              .subscribeOn(Schedulers.io())
              .subscribe({}, { error -> Log.w("PassportCameraView", "Tesseract warm-up failed", error) }))
    }
    rotation = getRotation(context, LensPosition.Back)

    val preview = binding.cameraPreview
    try {
      fotoapparat =
          Fotoapparat.with(context.applicationContext)
              .into(preview)
              .frameProcessor(callbackFrameProcessor)
              .lensPosition { LensPosition.Back }
              .build()
      fotoapparat?.updateConfiguration(configuration)
      preview.setOnTouchListener { _, event -> onTouchEvent(event) }

      fotoapparat?.start()
      cameraStarted = true
      configureZoom()
    } catch (e: Exception) {
      releaseCamera()
      dispatchError(e, "Failed to start camera")
    }
  }

  private fun releaseCamera() {
    frameProcessor?.stop()
    frameProcessor = null
    if (!disposable.isDisposed) {
      disposable.dispose()
    }
    disposable = CompositeDisposable()
    fotoapparat?.stop()
    fotoapparat = null
    cameraStarted = false
    isDecoding.set(false)
    tesseractProcessor?.let { processor ->
      // close() blocks until an in-flight recognition drains — keep it off the main thread.
      Schedulers.io().scheduleDirect { processor.close() }
    }
    tesseractProcessor = null
    tesseractInFlight.set(false)
  }

  private fun configureZoom() {
    fotoapparat?.getCapabilities()?.whenAvailable { capabilities ->
      val zoom = capabilities?.zoom as? Zoom.VariableZoom ?: return@whenAvailable
      setZoomProperties(zoom)
    }
  }

  private val callbackFrameProcessor: FrameProcessor
    get() =
        object : FrameProcessor {
          override fun process(frame: Frame) {
            try {
              if (!mounted || !isAttachedToWindow) {
                return
              }
              if (tesseractInFlight.get()) {
                return
              }
              if (!isDecoding.compareAndSet(false, true)) {
                return
              }

              val processor =
                  frameProcessor
                      ?: run {
                        isDecoding.set(false)
                        return
                      }
              val subscribe =
                  Single.fromCallable {
                        processor.process(
                            frame = frame,
                            rotation = rotation,
                            graphicOverlay = null,
                            true,
                            listener = ocrListener,
                        )
                      }
                      .subscribeOn(Schedulers.io())
                      .observeOn(AndroidSchedulers.mainThread())
                      .subscribe(
                          {
                            // No-op.
                          },
                          { error ->
                            isDecoding.set(false)
                            dispatchError(error, "Error scanning MRZ with camera")
                          },
                      )
              disposable.add(subscribe)
            } catch (e: Exception) {
              isDecoding.set(false)
              dispatchError(e, "Error scanning MRZ with camera")
            }
          }
        }

  private val ocrListener =
      object : VisionProcessorBase.Listener<com.google.mlkit.vision.text.Text> {
        override fun onSuccess(
            results: com.google.mlkit.vision.text.Text,
            frameMetadata: FrameMetadata?,
            timeRequired: Long,
            bitmap: Bitmap?,
            graphicOverlay: GraphicOverlay?,
        ) {
          if (!mounted || !isAttachedToWindow) {
            return
          }
          try {
            val callback =
                object : OcrUtils.MRZCallback by mrzListener {
                  override fun onMRZReadFailure(timeRequired: Long) {
                    if (!maybeStartTesseractFallback(results, bitmap, timeRequired)) {
                      mrzListener.onMRZReadFailure(timeRequired)
                    }
                  }
                }
            OcrUtils.processOcr(results = results, timeRequired = timeRequired, callback = callback)
          } catch (e: Exception) {
            mrzListener.onFailure(e, timeRequired)
          }
        }

        override fun onCanceled(timeRequired: Long) {
          isDecoding.set(false)
          if (!mounted || !isAttachedToWindow) {
            return
          }
        }

        override fun onFailure(e: Exception, timeRequired: Long) {
          isDecoding.set(false)
          if (!mounted || !isAttachedToWindow) {
            return
          }
          mrzListener.onFailure(e, timeRequired)
        }

        override fun onCompleted(timeRequired: Long) {
          isDecoding.set(false)
          if (!mounted || !isAttachedToWindow) {
            return
          }
        }
      }

  private val mrzListener =
      object : OcrUtils.MRZCallback {
        override fun onMRZRead(mrzInfo: org.jmrtd.lds.icao.MRZInfo, timeRequired: Long) {
          isDecoding.set(false)
          if (!mounted || !isAttachedToWindow) {
            return
          }
          if (!passportDispatched.compareAndSet(false, true)) {
            return
          }
          mainHandler.post {
            try {
              binding.statusViewBottom.setTextColor(ContextCompat.getColor(context, R.color.status_text))
              dispatchPassportRead(mrzInfo)
            } catch (_: IllegalStateException) {
              // View detached.
            }
          }
        }

        override fun onMRZReadFailure(timeRequired: Long) {
          isDecoding.set(false)
          if (!mounted || !isAttachedToWindow) {
            return
          }
          mainHandler.post {
            try {
              binding.statusViewBottom.setTextColor(Color.RED)
              binding.statusViewTop.text = ""
            } catch (_: IllegalStateException) {
              // View detached.
            }
          }
        }

        override fun onFailure(e: Exception, timeRequired: Long) {
          isDecoding.set(false)
          if (!mounted || !isAttachedToWindow) {
            return
          }
          mainHandler.post { dispatchError(e, "Something went wrong scanning MRZ with camera") }
        }
      }

  /**
   * Runs Tesseract (fine-tuned OCR-B model) over the frame when ML Kit found text but no
   * check-digit-valid MRZ — ML Kit misreads OCR-B confusables like 0/O. Returns true when the
   * fallback was started; the caller must then skip its own failure handling. Results flow
   * through the same OcrUtils validation and mrzListener, so only check-digit-valid MRZ data
   * is ever dispatched.
   */
  private fun maybeStartTesseractFallback(results: Text, bitmap: Bitmap?, timeRequired: Long): Boolean {
    if (!BuildConfig.TESSERACT_MRZ_FALLBACK) return false
    val processor = tesseractProcessor ?: return false
    if (bitmap == null || passportDispatched.get()) return false
    if (!TesseractMrzProcessor.looksLikeMrz(results)) return false
    if (!tesseractInFlight.compareAndSet(false, true)) return false
    disposable.add(
        Single.fromCallable { processor.recognizeMrz(bitmap, results) }
            .subscribeOn(Schedulers.io())
            .timeout(TESSERACT_TIMEOUT_SECONDS, TimeUnit.SECONDS, Schedulers.io())
            .doFinally { tesseractInFlight.set(false) }
            .subscribe(
                { rawText ->
                  if (rawText.isBlank()) {
                    mrzListener.onMRZReadFailure(timeRequired)
                  } else {
                    OcrUtils.processOcr(rawText = rawText, timeRequired = timeRequired, callback = mrzListener)
                  }
                },
                { error ->
                  Log.w("PassportCameraView", "Tesseract fallback failed", error)
                  processor.cancelCurrent()
                  mrzListener.onMRZReadFailure(timeRequired)
                }))
    return true
  }

  protected val textProcessor: OcrMrzDetectorProcessor
    get() = OcrMrzDetectorProcessor()

  @Suppress("DEPRECATION")
  private fun getRotation(context: Context, lensPosition: LensPosition = LensPosition.Back): Int {
    val facingCamera =
        when (lensPosition) {
          LensPosition.Front -> CameraCharacteristics.LENS_FACING_FRONT
          LensPosition.Back -> CameraCharacteristics.LENS_FACING_BACK
          LensPosition.External -> CameraCharacteristics.LENS_FACING_EXTERNAL
        }

    val manager = context.getSystemService(Context.CAMERA_SERVICE) as android.hardware.camera2.CameraManager
    try {
      for (cameraId in manager.cameraIdList) {
        val characteristics = manager.getCameraCharacteristics(cameraId)
        val facing = characteristics.get(CameraCharacteristics.LENS_FACING)
        if (facing != null && facing != facingCamera) {
          continue
        }

        val sensorOrientation = characteristics.get(CameraCharacteristics.SENSOR_ORIENTATION) ?: 0
        val rotationValue = (context.getSystemService(Context.WINDOW_SERVICE) as WindowManager).defaultDisplay.rotation
        val degrees =
            when (rotationValue) {
              Surface.ROTATION_0 -> 0
              Surface.ROTATION_90 -> 90
              Surface.ROTATION_180 -> 180
              Surface.ROTATION_270 -> 270
              else -> 0
            }
        var result =
            if (facing == CameraCharacteristics.LENS_FACING_FRONT) {
              (sensorOrientation + degrees - 360) % 360
            } else {
              (sensorOrientation - degrees + 360) % 360
            }
        if (facing == CameraCharacteristics.LENS_FACING_FRONT) {
          result = (360 + result) % 360
        }
        return result
      }
    } catch (_: Exception) {
      // Ignore and fall back to 0.
    }
    return 0
  }

  private fun setZoomProperties(zoom: Zoom.VariableZoom) {
    cameraZoom = zoom
    setZoomProgress(zoomProgress, zoom)
  }

  private fun setZoomProgress(progress: Int, zoom: Zoom.VariableZoom) {
    zoomProgress = progress
    fotoapparat?.setZoom(progress.toFloat() / zoom.maxZoom)
  }

  private fun getFingerSpacing(event: MotionEvent): Float {
    val x = event.getX(0) - event.getX(1)
    val y = event.getY(0) - event.getY(1)
    return kotlin.math.sqrt((x * x + y * y).toDouble()).toFloat()
  }

  override fun onTouchEvent(event: MotionEvent): Boolean {
    val action = event.action
    if (event.pointerCount > 1) {
      if (action == MotionEvent.ACTION_POINTER_DOWN) {
        mDist = getFingerSpacing(event)
      } else if (action == MotionEvent.ACTION_MOVE && cameraZoom != null) {
        handleZoom(event)
      }
    }
    return true
  }

  private fun handleZoom(event: MotionEvent) {
    val zoom = cameraZoom ?: return
    val maxZoom = zoom.maxZoom
    var currentZoom = zoomProgress
    val newDist = getFingerSpacing(event)
    if (newDist > mDist && currentZoom < maxZoom) {
      currentZoom++
    } else if (newDist < mDist && currentZoom > 0) {
      currentZoom--
    }

    if (currentZoom > maxZoom) {
      currentZoom = maxZoom
    }
    if (currentZoom < 0) {
      currentZoom = 0
    }

    mDist = newDist
    setZoomProgress(currentZoom, zoom)
  }

  private fun hasCameraPermission(): Boolean =
      ContextCompat.checkSelfPermission(context, android.Manifest.permission.CAMERA) ==
          PackageManager.PERMISSION_GRANTED

  private companion object {
    // Bounds a stuck native recognition so the tesseractInFlight gate can't wedge the scan loop.
    const val TESSERACT_TIMEOUT_SECONDS = 3L
  }

  private fun dispatchPassportRead(mrzInfo: org.jmrtd.lds.icao.MRZInfo) {
    val reactContext = UIManagerHelper.getReactContext(this) as? ReactContext ?: return
    val dispatcher = UIManagerHelper.getEventDispatcherForReactTag(reactContext, id) ?: return
    dispatcher.dispatchEvent(
        PassportReadEvent(UIManagerHelper.getSurfaceId(this), id, mrzInfo.toString()))
  }

  private fun dispatchError(e: Throwable, message: String) {
    Log.e("PassportCameraView", message, e)
    val reactContext = UIManagerHelper.getReactContext(this) as? ReactContext ?: return
    val dispatcher = UIManagerHelper.getEventDispatcherForReactTag(reactContext, id) ?: return
    dispatcher.dispatchEvent(
        PassportErrorEvent(
            UIManagerHelper.getSurfaceId(this),
            id,
            message,
            e::class.java.simpleName,
            e.stackTraceToString(),
        ))
  }
}

internal class PassportReadEvent(
    surfaceId: Int,
    viewId: Int,
    private val data: String,
) : Event<PassportReadEvent>(surfaceId, viewId) {
  override fun getEventName(): String = EVENT_NAME

  override fun getEventData() =
      Arguments.createMap().apply {
        putString("data", data)
      }

  private companion object {
    const val EVENT_NAME = "topPassportRead"
  }
}

internal class PassportErrorEvent(
    surfaceId: Int,
    viewId: Int,
    private val message: String,
    private val error: String,
    private val stackTrace: String,
) : Event<PassportErrorEvent>(surfaceId, viewId) {
  override fun getEventName(): String = EVENT_NAME

  override fun getEventData() =
      Arguments.createMap().apply {
        putString("errorMessage", message)
        putString("error", error)
        putString("stackTrace", stackTrace)
      }

  private companion object {
    const val EVENT_NAME = "topError"
  }
}
