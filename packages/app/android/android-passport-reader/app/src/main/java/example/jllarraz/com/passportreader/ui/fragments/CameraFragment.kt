package example.jllarraz.com.passportreader.ui.fragments

import android.Manifest
import android.app.AlertDialog
import android.app.Dialog
import android.content.Context
import android.content.pm.PackageManager
import android.hardware.camera2.CameraCharacteristics
import android.os.Bundle
import android.util.Log
import android.view.MotionEvent
import android.view.Surface
import android.view.View
import android.view.WindowManager
import android.widget.Toast
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import example.jllarraz.com.passportreader.R
import io.fotoapparat.Fotoapparat
import io.fotoapparat.characteristic.LensPosition
import io.fotoapparat.configuration.CameraConfiguration
import io.fotoapparat.parameter.Zoom
import io.fotoapparat.preview.FrameProcessor
import io.fotoapparat.selector.*
import io.fotoapparat.view.CameraView

abstract class CameraFragment : androidx.fragment.app.Fragment(), ActivityCompat.OnRequestPermissionsResultCallback {


    /**
     * Camera Manager
     */
    protected var fotoapparat: Fotoapparat? = null
    protected var hasCameraPermission: Boolean = false
    protected var rotation: Int = 0

    private var cameraZoom: Zoom.VariableZoom? = null
    private var zoomProgress: Int = 0


    private var mDist: Float = 0.toFloat()

    var configuration = CameraConfiguration(
            // A full configuration
            // ...
            focusMode = firstAvailable(
                    autoFocus()
            ),
            flashMode = off()
    )


    ////////////////////////////////////////

    abstract val callbackFrameProcessor: FrameProcessor
    abstract val cameraPreview: CameraView
    abstract val requestedPermissions: ArrayList<String>
    var initialLensPosition: LensPosition = LensPosition.Back

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)


        if (savedInstanceState != null) {
            if (savedInstanceState.containsKey(KEY_CURRENT_ZOOM_PROGRESS)) {
                zoomProgress = savedInstanceState.getInt(KEY_CURRENT_ZOOM_PROGRESS, 0)
            }
        }
    }


    override fun onActivityCreated(savedInstanceState: Bundle?) {
        super.onActivityCreated(savedInstanceState)
    }

    override fun onSaveInstanceState(outState: Bundle) {
        outState.putInt(KEY_CURRENT_ZOOM_PROGRESS, zoomProgress)
        super.onSaveInstanceState(outState)
    }

    fun buildCamera(cameraView: CameraView, lensPosition: LensPosition = LensPosition.Back) {
        if (fotoapparat == null) {
            fotoapparat = Fotoapparat
                    .with(context?.applicationContext!!)
                    .into(cameraView)
                    .frameProcessor(
                            callbackFrameProcessor
                    )
                    .lensPosition { lensPosition }
                    .build()

            fotoapparat?.updateConfiguration(configuration)

        }

        cameraView.setOnTouchListener(object : View.OnTouchListener {
            override fun onTouch(v: View?, event: MotionEvent?): Boolean {
                return onTouchEvent(event!!)
            }
        })
    }

    fun configureZoom() {
        fotoapparat?.getCapabilities()
                ?.whenAvailable { capabilities ->
                    setZoomProperties(capabilities?.zoom as Zoom.VariableZoom)
                }

    }

    private fun setZoomProperties(zoom: Zoom.VariableZoom) {
        cameraZoom = zoom
        setZoomProgress(zoomProgress, cameraZoom!!)

    }


    private fun setZoomProgress(progress: Int, zoom: Zoom.VariableZoom) {
        zoomProgress = progress
        fotoapparat?.setZoom(progress.toFloat() / zoom.maxZoom)
    }


    /** Determine the space between the first two fingers  */
    private fun getFingerSpacing(event: MotionEvent): Float {
        // ...
        val x = event.getX(0) - event.getX(1)
        val y = event.getY(0) - event.getY(1)

        return Math.sqrt((x * x + y * y).toDouble()).toFloat()
    }


    protected fun setFlash(isEnable: Boolean) {
        configuration = configuration.copy(flashMode = if (isEnable) torch() else off())
        fotoapparat?.updateConfiguration(configuration)
    }

    protected fun setFocusMode(focusModeSelector: FocusModeSelector) {
        configuration = configuration.copy(focusMode = focusModeSelector)
        fotoapparat?.updateConfiguration(configuration)
    }

    override fun onResume() {
        super.onResume()

        rotation = getRotation(context!!, initialLensPosition)
        buildCamera(cameraPreview!!, initialLensPosition)

        hasCameraPermission = hasCameraPermission()
        if (hasCameraPermission) {
            checkPermissions(requestedPermissions)
        } else {
            fotoapparat?.start()
            configureZoom()
        }
    }

    override fun onPause() {
        hasCameraPermission = hasCameraPermission()
        if (!hasCameraPermission) {
            fotoapparat?.stop()
        }
        fotoapparat = null;
        super.onPause()
    }

    override fun onDestroyView() {
        super.onDestroyView()
    }

    override fun onAttach(context: Context) {
        super.onAttach(context)
    }

    override fun onDetach() {
        super.onDetach()

    }


    ////////////////////////////////////////////////////////////////////////////////////////
    //
    //       Pinch on Zoom Functionality
    //
    ////////////////////////////////////////////////////////////////////////////////////////


    fun onTouchEvent(event: MotionEvent): Boolean {
        // Get the pointer ID
        val action = event.action


        if (event.pointerCount > 1) {
            // handle multi-touch events
            if (action == MotionEvent.ACTION_POINTER_DOWN) {
                mDist = getFingerSpacing(event)
            } else if (action == MotionEvent.ACTION_MOVE && cameraZoom != null) {
                handleZoom(event)
            }
        } else {
            // handle single touch events
            if (action == MotionEvent.ACTION_UP) {
                // setFocusMode (previousFocusMode!!)
            }
        }
        return true
    }

    private fun handleZoom(event: MotionEvent) {
        if (cameraZoom == null) {
            return
        }

        val maxZoom = cameraZoom?.maxZoom!!
        var zoom = zoomProgress
        val newDist = getFingerSpacing(event)
        if (newDist > mDist) {
            //zoom in
            if (zoom < maxZoom)
                zoom++
        } else if (newDist < mDist) {
            //zoom out
            if (zoom > 0)
                zoom--
        }

        if (zoom > maxZoom) {
            zoom = maxZoom
        }

        if (zoom < 0) {
            zoom = 0
        }


        mDist = newDist
        setZoomProgress(zoom, cameraZoom!!)
        //zoomProgress = cameraZoom?.zoomRatios!![zoom]
    }


    ////////////////////////////////////////////////////////////////////////////////////////
    //
    //        Permissions
    //
    ////////////////////////////////////////////////////////////////////////////////////////

    protected fun hasCameraPermission(): Boolean {
        return ContextCompat.checkSelfPermission(context!!, Manifest.permission.CAMERA) != PackageManager.PERMISSION_GRANTED
    }

    protected fun checkPermissions(permissions: ArrayList<String> = ArrayList()) {
        //request permission
        val hasPermissionCamera = ContextCompat.checkSelfPermission(context!!,
                Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED
        if (!hasPermissionCamera && !permissions.contains(Manifest.permission.CAMERA)) {
            permissions.add(Manifest.permission.CAMERA)
        }

        if (permissions.isNotEmpty()) {
            requestPermissions(permissions.toArray(arrayOf<String>()),
                    REQUEST_PERMISSIONS)
        }
    }


    override fun onRequestPermissionsResult(requestCode: Int, permissions: Array<String>,
                                            grantResults: IntArray) {
        when (requestCode) {
            REQUEST_PERMISSIONS -> {
                val permissionsDenied = ArrayList<String>()
                val permissionsGranted = ArrayList<String>()
                permissions.forEachIndexed { index, element ->
                    if (grantResults[index] != PackageManager.PERMISSION_GRANTED) {
                        permissionsDenied.add(element)
                    } else {
                        permissionsGranted.add(element)
                    }
                }

                for (permission in permissionsDenied) {
                    when (permission) {
                        Manifest.permission.CAMERA -> {
                            showErrorCameraPermissionDenied()
                        }
                    }
                }
                for (permission in permissionsGranted) {
                    when (permission) {
                        Manifest.permission.CAMERA -> {
                            hasCameraPermission = true
                            fotoapparat?.start()
                        }
                    }
                }

                onRequestPermissionsResult(permissionsDenied, permissionsGranted)
            }
            else -> {
                super.onRequestPermissionsResult(requestCode, permissions, grantResults)
            }
        }
    }

    abstract fun onRequestPermissionsResult(permissionsDenied: ArrayList<String>, permissionsGranted: ArrayList<String>)

    protected fun showErrorCameraPermissionDenied() {
        ErrorDialog.newInstance(getString(R.string.permission_camera_rationale))
                .show(childFragmentManager, FRAGMENT_DIALOG)
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
                    .setMessage(arguments!!.getString(ARG_MESSAGE))
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

    fun getRotation(context: Context, lensPosition: LensPosition = LensPosition.Back): Int {

        var facingCamera = 0
        when (lensPosition) {
            LensPosition.Front -> {
                facingCamera = CameraCharacteristics.LENS_FACING_FRONT
            }
            LensPosition.Back -> {
                facingCamera = CameraCharacteristics.LENS_FACING_BACK
            }
            LensPosition.External -> {
                facingCamera = CameraCharacteristics.LENS_FACING_EXTERNAL
            }
        }

        val manager = context.getSystemService(Context.CAMERA_SERVICE) as android.hardware.camera2.CameraManager
        try {
            for (cameraId in manager.getCameraIdList()) {
                val characteristics = manager.getCameraCharacteristics(cameraId)
                val facing = characteristics.get(CameraCharacteristics.LENS_FACING)
                if (facing != null && facing != facingCamera) {
                    continue
                }

                val mSensorOrientation = characteristics.get(CameraCharacteristics.SENSOR_ORIENTATION)!!
                val rotation = (context.getSystemService(Context.WINDOW_SERVICE) as WindowManager).defaultDisplay.rotation
                var degrees = 0
                when (rotation) {
                    Surface.ROTATION_0 -> degrees = 0
                    Surface.ROTATION_90 -> degrees = 90
                    Surface.ROTATION_180 -> degrees = 180
                    Surface.ROTATION_270 -> degrees = 270
                }
                var result: Int
                if (facing == CameraCharacteristics.LENS_FACING_FRONT) {
                    result = (mSensorOrientation + degrees - 360) % 360
                    result = (360 + result) % 360  // compensate the mirror
                } else {  // back-facing
                    result = (mSensorOrientation - degrees + 360) % 360
                }
                return result
            }
        } catch (e: Exception) {
        }
        return 0
    }


    companion object {

        /**
         * Tag for the [Log].
         */
        private val TAG = CameraFragment::class.java.simpleName

        private val KEY_CURRENT_ZOOM_PROGRESS = "KEY_CURRENT_ZOOM_PROGRESS"
        private val REQUEST_PERMISSIONS = 410
        private val FRAGMENT_DIALOG = TAG

    }
}