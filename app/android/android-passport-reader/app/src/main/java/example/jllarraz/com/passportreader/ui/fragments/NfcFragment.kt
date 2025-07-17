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
    private var isNfcEnabled: Boolean = false

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?,
                              savedInstanceState: Bundle?): View? {
        Log.d(TAG, "onCreateView: Creating NfcFragment view")
        binding = FragmentNfcBinding.inflate(inflater, container, false)
        Log.d(TAG, "onCreateView: Fragment view created successfully")
        return binding?.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        Log.d(TAG, "onViewCreated: View created, processing arguments")

        val arguments = arguments
        if (arguments!!.containsKey(IntentData.KEY_MRZ_INFO)) {
            mrzInfo = arguments.getSerializable(IntentData.KEY_MRZ_INFO) as MRZInfo
            Log.d(TAG, "onViewCreated: MRZ info loaded from arguments: ${mrzInfo?.documentNumber}")
        } else {
            Log.e(TAG, "onViewCreated: Missing MRZ info in arguments")
            //error
        }
    }

    fun handleNfcTag(intent: Intent?) {
        Log.d(TAG, "handleNfcTag: Called with intent: $intent")
        if (intent == null || intent.extras == null) {
            Log.w(TAG, "handleNfcTag: Intent or extras are null, returning")
            return
        }

        val tag = intent.getParcelableExtra<Tag>(NfcAdapter.EXTRA_TAG)
        Log.d(TAG, "handleNfcTag: Extracted tag: $tag")
        if (tag == null) {
            Log.w(TAG, "handleNfcTag: No NFC tag found in intent")
            return
        }

        Log.d(TAG, "handleNfcTag: Tag ID: ${tag.id?.contentToString()}")
        Log.d(TAG, "handleNfcTag: Tag technologies: ${tag.techList?.contentToString()}")

        // Enable NFC now that we're actually about to start scanning
        enableNfc()

        val folder = requireContext().getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS)!!
        Log.d(TAG, "handleNfcTag: External files directory: $folder")

        val keyStore = KeyStoreUtils().readKeystoreFromFile(folder)
        Log.d(TAG, "handleNfcTag: KeyStore loaded: ${keyStore != null}")

        val mrtdTrustStore = MRTDTrustStore()
        if(keyStore!=null){
            val certStore = KeyStoreUtils().toCertStore(keyStore = keyStore)
            mrtdTrustStore.addAsCSCACertStore(certStore)
            Log.d(TAG, "handleNfcTag: Certificate store added to MRTD trust store")
        } else {
            Log.w(TAG, "handleNfcTag: No keystore available")
        }
        //mrtdTrustStore.addCSCAStore(readKeystoreFromFile)

        Log.d(TAG, "handleNfcTag: Starting NFCDocumentTag.handleTag")
        val subscribe = NFCDocumentTag().handleTag(requireContext(), tag, mrzInfo!!, mrtdTrustStore, object : NFCDocumentTag.PassportCallback {

            override fun onPassportReadStart() {
                Log.d(TAG, "PassportCallback.onPassportReadStart: NFC reading started")
                onNFCSReadStart()
            }

            override fun onPassportReadFinish() {
                Log.d(TAG, "PassportCallback.onPassportReadFinish: NFC reading finished")
                onNFCReadFinish()
            }

            override fun onPassportRead(passport: Passport?) {
                Log.d(TAG, "PassportCallback.onPassportRead: Passport read successfully: $passport")
                // Disable NFC after successful read
                disableNfc()
                this@NfcFragment.onPassportRead(passport)

            }

            override fun onAccessDeniedException(exception: AccessDeniedException) {
                Log.e(TAG, "PassportCallback.onAccessDeniedException: Access denied", exception)
                // Disable NFC after error
                disableNfc()
                Toast.makeText(context, getString(R.string.warning_authentication_failed), Toast.LENGTH_SHORT).show()
                exception.printStackTrace()
                this@NfcFragment.onCardException(exception)

            }

            override fun onBACDeniedException(exception: BACDeniedException) {
                Log.e(TAG, "PassportCallback.onBACDeniedException: BAC denied", exception)
                // Disable NFC after error
                disableNfc()
                Toast.makeText(context, exception.toString(), Toast.LENGTH_SHORT).show()
                this@NfcFragment.onCardException(exception)
            }

            override fun onPACEException(exception: PACEException) {
                Log.e(TAG, "PassportCallback.onPACEException: PACE exception", exception)
                // Disable NFC after error
                disableNfc()
                Toast.makeText(context, exception.toString(), Toast.LENGTH_SHORT).show()
                this@NfcFragment.onCardException(exception)
            }

            override fun onCardException(exception: CardServiceException) {
                Log.e(TAG, "PassportCallback.onCardException: Card service exception", exception)
                // Disable NFC after error
                disableNfc()
                val sw = exception.sw.toShort()
                when (sw) {
                    ISO7816.SW_CLA_NOT_SUPPORTED -> {
                        Log.e(TAG, "PassportCallback.onCardException: CLA not supported")
                        Toast.makeText(context, getString(R.string.warning_cla_not_supported), Toast.LENGTH_SHORT).show()
                    }
                    else -> {
                        Log.e(TAG, "PassportCallback.onCardException: Other card exception: $sw")
                        Toast.makeText(context, exception.toString(), Toast.LENGTH_SHORT).show()
                    }
                }
                this@NfcFragment.onCardException(exception)
            }

            override fun onGeneralException(exception: Exception?) {
                Log.e(TAG, "PassportCallback.onGeneralException: General exception", exception)
                // Disable NFC after error
                disableNfc()
                Toast.makeText(context, exception!!.toString(), Toast.LENGTH_SHORT).show()
                this@NfcFragment.onCardException(exception)
            }
        })

        disposable.add(subscribe)
        Log.d(TAG, "handleNfcTag: Added subscription to disposable")

    }

    override fun onAttach(context: Context) {
        super.onAttach(context)
        Log.d(TAG, "onAttach: Fragment attached to context: $context")
        val activity = activity
        if (activity is NfcFragment.NfcFragmentListener) {
            nfcFragmentListener = activity
            Log.d(TAG, "onAttach: NfcFragmentListener set from activity")
        } else {
            Log.w(TAG, "onAttach: Activity does not implement NfcFragmentListener")
        }
    }

    override fun onDetach() {
        Log.d(TAG, "onDetach: Fragment detaching")
        nfcFragmentListener = null
        super.onDetach()
    }


    override fun onResume() {
        super.onResume()
        Log.d(TAG, "onResume: Fragment resumed")

        binding?.valuePassportNumber?.text = getString(R.string.doc_number, mrzInfo!!.documentNumber)
        binding?.valueDOB?.text = getString(R.string.doc_dob, mrzInfo!!.dateOfBirth)
        binding?.valueExpirationDate?.text = getString(R.string.doc_expiry, mrzInfo!!.dateOfExpiry)
        Log.d(TAG, "onResume: UI updated with MRZ info")

        // NFC is no longer auto-enabled on resume - it will be enabled explicitly when scanning starts
        Log.d(TAG, "onResume: NFC not auto-enabled - waiting for explicit user action")
    }

    override fun onPause() {
        super.onPause()
        Log.d(TAG, "onPause: Fragment paused")

        // Only disable NFC if it was previously enabled
        if (isNfcEnabled) {
            disableNfc()
        } else {
            Log.d(TAG, "onPause: NFC was not enabled, no need to disable")
        }
    }

    /**
     * Explicitly enable NFC scanning - should only be called when user starts scanning
     */
    fun enableNfc() {
        Log.d(TAG, "enableNfc: Explicitly enabling NFC for scanning")
        if (isNfcEnabled) {
            Log.w(TAG, "enableNfc: NFC already enabled, skipping")
            return
        }

        if (nfcFragmentListener != null) {
            Log.d(TAG, "enableNfc: Calling nfcFragmentListener.onEnableNfc()")
            nfcFragmentListener!!.onEnableNfc()
            isNfcEnabled = true
            Log.d(TAG, "enableNfc: NFC enabled successfully")
        } else {
            Log.e(TAG, "enableNfc: nfcFragmentListener is null, cannot enable NFC")
        }
    }

    /**
     * Explicitly disable NFC scanning - should be called when scanning completes or is cancelled
     */
    fun disableNfc() {
        Log.d(TAG, "disableNfc: Explicitly disabling NFC")
        if (!isNfcEnabled) {
            Log.w(TAG, "disableNfc: NFC not enabled, skipping")
            return
        }

        if (nfcFragmentListener != null) {
            Log.d(TAG, "disableNfc: Calling nfcFragmentListener.onDisableNfc()")
            nfcFragmentListener!!.onDisableNfc()
            isNfcEnabled = false
            Log.d(TAG, "disableNfc: NFC disabled successfully")
        } else {
            Log.e(TAG, "disableNfc: nfcFragmentListener is null, cannot disable NFC")
        }
    }

    override fun onDestroyView() {
        Log.d(TAG, "onDestroyView: Fragment view being destroyed")

        // Ensure NFC is disabled when fragment is destroyed
        if (isNfcEnabled) {
            Log.d(TAG, "onDestroyView: NFC was enabled, disabling for cleanup")
            disableNfc()
        }

        if (!disposable.isDisposed()) {
            Log.d(TAG, "onDestroyView: Disposing of RxJava disposables")
            disposable.dispose();
        }
        binding = null
        super.onDestroyView()
    }

    protected fun onNFCSReadStart() {
        Log.d(TAG, "onNFCSReadStart: NFC reading started")
        mHandler.post {
            Log.d(TAG, "onNFCSReadStart: Setting progress bar visible")
            binding?.progressBar?.visibility = View.VISIBLE
        }

    }

    protected fun onNFCReadFinish() {
        Log.d(TAG, "onNFCReadFinish: NFC reading finished")
        mHandler.post {
            Log.d(TAG, "onNFCReadFinish: Hiding progress bar")
            binding?.progressBar?.visibility = View.GONE
        }
    }

    protected fun onCardException(cardException: Exception?) {
        Log.e(TAG, "onCardException: Card exception occurred", cardException)
        mHandler.post {
            if (nfcFragmentListener != null) {
                Log.d(TAG, "onCardException: Notifying listener of card exception")
                nfcFragmentListener?.onCardException(cardException)
            } else {
                Log.w(TAG, "onCardException: nfcFragmentListener is null, cannot notify")
            }
        }
    }

    protected fun onPassportRead(passport: Passport?) {
        Log.d(TAG, "onPassportRead: Passport read: $passport")
        mHandler.post {
            if (nfcFragmentListener != null) {
                Log.d(TAG, "onPassportRead: Notifying listener of passport read")
                nfcFragmentListener?.onPassportRead(passport)
            } else {
                Log.w(TAG, "onPassportRead: nfcFragmentListener is null, cannot notify")
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
            Log.d(TAG, "newInstance: Creating new NfcFragment with MRZ info: ${mrzInfo.documentNumber}")
            val myFragment = NfcFragment()
            val args = Bundle()
            args.putSerializable(IntentData.KEY_MRZ_INFO, mrzInfo)
            myFragment.arguments = args
            return myFragment
        }
    }
}
