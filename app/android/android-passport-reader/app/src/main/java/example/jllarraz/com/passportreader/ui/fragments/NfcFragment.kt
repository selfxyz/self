package example.jllarraz.com.passportreader.ui.fragments

import android.content.Context
import android.content.Intent
import android.nfc.NfcAdapter
import android.nfc.Tag
import android.os.Bundle
import android.os.Environment
import android.os.Handler
import android.os.Looper
import android.util.Log
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.ProgressBar
import android.widget.TextView
import android.widget.Toast

import net.sf.scuba.smartcards.CardServiceException
import net.sf.scuba.smartcards.ISO7816


import org.jmrtd.AccessDeniedException
import org.jmrtd.BACDeniedException
import org.jmrtd.PACEException
import org.jmrtd.lds.icao.MRZInfo


import java.security.Security


import example.jllarraz.com.passportreader.R
import example.jllarraz.com.passportreader.common.IntentData
import example.jllarraz.com.passportreader.data.Passport
import example.jllarraz.com.passportreader.databinding.FragmentNfcBinding
import example.jllarraz.com.passportreader.utils.KeyStoreUtils
import example.jllarraz.com.passportreader.utils.NFCDocumentTag
import io.reactivex.disposables.CompositeDisposable
import org.jmrtd.MRTDTrustStore


class NfcFragment : androidx.fragment.app.Fragment() {

    private var mrzInfo: MRZInfo? = null
    private var nfcFragmentListener: NfcFragmentListener? = null

    internal var mHandler = Handler(Looper.getMainLooper())
    var disposable = CompositeDisposable()

    private var binding:FragmentNfcBinding?=null
    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?,
                              savedInstanceState: Bundle?): View? {
        binding = FragmentNfcBinding.inflate(inflater, container, false)
        return binding?.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        val arguments = arguments
        if (arguments!!.containsKey(IntentData.KEY_MRZ_INFO)) {
            mrzInfo = arguments.getSerializable(IntentData.KEY_MRZ_INFO) as MRZInfo
        } else {
            //error
        }
    }

    fun handleNfcTag(intent: Intent?) {
        if (intent == null || intent.extras == null) {
            return
        }
        val tag = intent.getParcelableExtra<Tag>(NfcAdapter.EXTRA_TAG) ?: return

        val folder = requireContext().getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS)!!
        val keyStore = KeyStoreUtils().readKeystoreFromFile(folder)

        val mrtdTrustStore = MRTDTrustStore()
        if(keyStore!=null){
            val certStore = KeyStoreUtils().toCertStore(keyStore = keyStore)

            mrtdTrustStore.addAsCSCACertStore(certStore)
        }
        //mrtdTrustStore.addCSCAStore(readKeystoreFromFile)


        val subscribe = NFCDocumentTag().handleTag(requireContext(), tag, mrzInfo!!, mrtdTrustStore, object : NFCDocumentTag.PassportCallback {

            override fun onPassportReadStart() {
                onNFCSReadStart()
            }

            override fun onPassportReadFinish() {
                onNFCReadFinish()
            }

            override fun onPassportRead(passport: Passport?) {
                this@NfcFragment.onPassportRead(passport)

            }

            override fun onAccessDeniedException(exception: AccessDeniedException) {
                Toast.makeText(context, getString(R.string.warning_authentication_failed), Toast.LENGTH_SHORT).show()
                exception.printStackTrace()
                this@NfcFragment.onCardException(exception)

            }

            override fun onBACDeniedException(exception: BACDeniedException) {
                Toast.makeText(context, exception.toString(), Toast.LENGTH_SHORT).show()
                this@NfcFragment.onCardException(exception)
            }

            override fun onPACEException(exception: PACEException) {
                Toast.makeText(context, exception.toString(), Toast.LENGTH_SHORT).show()
                this@NfcFragment.onCardException(exception)
            }

            override fun onCardException(exception: CardServiceException) {
                val sw = exception.sw.toShort()
                when (sw) {
                    ISO7816.SW_CLA_NOT_SUPPORTED -> {
                        Toast.makeText(context, getString(R.string.warning_cla_not_supported), Toast.LENGTH_SHORT).show()
                    }
                    else -> {
                        Toast.makeText(context, exception.toString(), Toast.LENGTH_SHORT).show()
                    }
                }
                this@NfcFragment.onCardException(exception)
            }

            override fun onGeneralException(exception: Exception?) {
                Toast.makeText(context, exception!!.toString(), Toast.LENGTH_SHORT).show()
                this@NfcFragment.onCardException(exception)
            }
        })

        disposable.add(subscribe)

    }

    override fun onAttach(context: Context) {
        super.onAttach(context)
        val activity = activity
        if (activity is NfcFragment.NfcFragmentListener) {
            nfcFragmentListener = activity
        }
    }

    override fun onDetach() {
        nfcFragmentListener = null
        super.onDetach()
    }


    override fun onResume() {
        super.onResume()

        binding?.valuePassportNumber?.text = getString(R.string.doc_number, mrzInfo!!.documentNumber)
        binding?.valueDOB?.text = getString(R.string.doc_dob, mrzInfo!!.dateOfBirth)
        binding?.valueExpirationDate?.text = getString(R.string.doc_expiry, mrzInfo!!.dateOfExpiry)

        if (nfcFragmentListener != null) {
            nfcFragmentListener!!.onEnableNfc()
        }
    }

    override fun onPause() {
        super.onPause()
        if (nfcFragmentListener != null) {
            nfcFragmentListener!!.onDisableNfc()
        }
    }

    override fun onDestroyView() {
        if (!disposable.isDisposed()) {
            disposable.dispose();
        }
        binding = null
        super.onDestroyView()
    }

    protected fun onNFCSReadStart() {
        Log.d(TAG, "onNFCSReadStart")
        mHandler.post {
            binding?.progressBar?.visibility = View.VISIBLE }

    }

    protected fun onNFCReadFinish() {
        Log.d(TAG, "onNFCReadFinish")
        mHandler.post { binding?.progressBar?.visibility = View.GONE }
    }

    protected fun onCardException(cardException: Exception?) {
        mHandler.post {
            if (nfcFragmentListener != null) {
                nfcFragmentListener?.onCardException(cardException)
            }
        }
    }

    protected fun onPassportRead(passport: Passport?) {
        mHandler.post {
            if (nfcFragmentListener != null) {
                nfcFragmentListener?.onPassportRead(passport)
            }
        }
    }

    interface NfcFragmentListener {
        fun onEnableNfc()
        fun onDisableNfc()
        fun onPassportRead(passport: Passport?)
        fun onCardException(cardException: Exception?)
    }



    companion object {
        private val TAG = NfcFragment::class.java.simpleName

        init {
            Security.insertProviderAt(org.spongycastle.jce.provider.BouncyCastleProvider(), 1)
        }
        fun newInstance(mrzInfo: MRZInfo): NfcFragment {
            val myFragment = NfcFragment()
            val args = Bundle()
            args.putSerializable(IntentData.KEY_MRZ_INFO, mrzInfo)
            myFragment.arguments = args
            return myFragment
        }
    }
}
