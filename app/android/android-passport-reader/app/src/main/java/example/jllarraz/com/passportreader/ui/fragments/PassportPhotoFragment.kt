package example.jllarraz.com.passportreader.ui.fragments

import android.content.Context
import android.graphics.Bitmap
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup

import example.jllarraz.com.passportreader.common.IntentData
import example.jllarraz.com.passportreader.databinding.FragmentPhotoBinding

class PassportPhotoFragment : androidx.fragment.app.Fragment() {

    private var passportPhotoFragmentListener: PassportPhotoFragmentListener? = null

    private var bitmap: Bitmap? = null


    private var binding:FragmentPhotoBinding?=null
    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?,
                              savedInstanceState: Bundle?): View? {
        binding = FragmentPhotoBinding.inflate(inflater, container, false)
        return binding?.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        val arguments = arguments
        if (arguments!!.containsKey(IntentData.KEY_IMAGE)) {
            bitmap = arguments.getParcelable<Bitmap>(IntentData.KEY_IMAGE)
        } else {
            //error
        }
    }

    override fun onResume() {
        super.onResume()
        refreshData(bitmap)
    }

    private fun refreshData(bitmap: Bitmap?) {
        if (bitmap == null) {
            return
        }
        binding?.image?.setImageBitmap(bitmap)
    }


    override fun onAttach(context: Context) {
        super.onAttach(context)
        val activity = activity
        if (activity is PassportPhotoFragmentListener) {
            passportPhotoFragmentListener = activity
        }
    }

    override fun onDetach() {
        passportPhotoFragmentListener = null
        super.onDetach()

    }

    override fun onDestroyView() {
        binding = null
        super.onDestroyView()
    }

    interface PassportPhotoFragmentListener

    companion object {

        fun newInstance(bitmap: Bitmap): PassportPhotoFragment {
            val myFragment = PassportPhotoFragment()
            val args = Bundle()
            args.putParcelable(IntentData.KEY_IMAGE, bitmap)
            myFragment.arguments = args
            return myFragment
        }
    }

}
