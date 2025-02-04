package example.jllarraz.com.passportreader.ui.fragments


import android.content.Context
import android.content.DialogInterface
import android.graphics.Bitmap
import android.os.Bundle
import android.os.Environment
import android.util.Log
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.*
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.widget.AppCompatEditText
import com.mobsandgeeks.saripaar.ValidationError
import com.mobsandgeeks.saripaar.Validator
import example.jllarraz.com.passportreader.R
import example.jllarraz.com.passportreader.databinding.FragmentSelectionBinding
import example.jllarraz.com.passportreader.network.MasterListService
import example.jllarraz.com.passportreader.ui.validators.DateRule
import example.jllarraz.com.passportreader.ui.validators.DocumentNumberRule
import example.jllarraz.com.passportreader.utils.KeyStoreUtils
import io.reactivex.Single
import io.reactivex.android.schedulers.AndroidSchedulers
import io.reactivex.disposables.CompositeDisposable
import io.reactivex.schedulers.Schedulers
import net.sf.scuba.data.Gender
import org.jmrtd.lds.icao.MRZInfo
import java.security.Security
import java.security.cert.Certificate

class SelectionFragment : androidx.fragment.app.Fragment(), Validator.ValidationListener {

    private var radioGroup: RadioGroup? = null
    private var linearLayoutManual: LinearLayout? = null
    private var linearLayoutAutomatic: LinearLayout? = null
    private var appCompatEditTextDocumentNumber: AppCompatEditText? = null
    private var appCompatEditTextDocumentExpiration: AppCompatEditText? = null
    private var appCompatEditTextDateOfBirth: AppCompatEditText? = null
    private var buttonReadNFC: Button? = null

    private var mValidator: Validator? = null
    private var selectionFragmentListener: SelectionFragmentListener? = null
    var disposable = CompositeDisposable()

    private var binding:FragmentSelectionBinding?=null
    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?,
                              savedInstanceState: Bundle?): View? {
        binding = FragmentSelectionBinding.inflate(inflater, container, false)
        return binding?.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        radioGroup = view.findViewById(R.id.radioButtonDataEntry)
        linearLayoutManual = view.findViewById(R.id.layoutManual)
        linearLayoutAutomatic = view.findViewById(R.id.layoutAutomatic)
        appCompatEditTextDocumentNumber = view.findViewById(R.id.documentNumber)
        appCompatEditTextDocumentExpiration = view.findViewById(R.id.documentExpiration)
        appCompatEditTextDateOfBirth = view.findViewById(R.id.documentDateOfBirth)
        buttonReadNFC = view.findViewById(R.id.buttonReadNfc)

        radioGroup!!.setOnCheckedChangeListener { group, checkedId ->
            when (checkedId) {
                R.id.radioButtonManual -> {
                    linearLayoutManual!!.visibility = View.VISIBLE
                    linearLayoutAutomatic!!.visibility = View.GONE
                }
                R.id.radioButtonOcr -> {
                    linearLayoutManual!!.visibility = View.GONE
                    linearLayoutAutomatic!!.visibility = View.VISIBLE
                    if (selectionFragmentListener != null) {
                        selectionFragmentListener!!.onMrzRequest()
                    }
                }
            }
        }

        buttonReadNFC!!.setOnClickListener { validateFields() }

        mValidator = Validator(this)
        mValidator!!.setValidationListener(this)

        mValidator!!.put(appCompatEditTextDocumentNumber!!, DocumentNumberRule())
        mValidator!!.put(appCompatEditTextDocumentExpiration!!, DateRule())
        mValidator!!.put(appCompatEditTextDateOfBirth!!, DateRule())


        binding?.buttonDownloadCSCA?.setOnClickListener {
            requireDownloadCSCA()
        }
        binding?.buttonDeleteCSCA?.setOnClickListener {
            val subscribe = cleanCSCAFolder()
                    .subscribeOn(Schedulers.io())
                    .observeOn(AndroidSchedulers.mainThread())
                    .subscribe { result ->
                        Toast.makeText(requireContext(), "CSCA Folder deleted", Toast.LENGTH_SHORT).show()
                    }
            disposable.add(subscribe)
        }
    }

    protected fun validateFields() {
        try {
            mValidator!!.removeRules(appCompatEditTextDocumentNumber!!)
            mValidator!!.removeRules(appCompatEditTextDocumentExpiration!!)
            mValidator!!.removeRules(appCompatEditTextDateOfBirth!!)

            mValidator!!.put(appCompatEditTextDocumentNumber!!, DocumentNumberRule())
            mValidator!!.put(appCompatEditTextDocumentExpiration!!, DateRule())
            mValidator!!.put(appCompatEditTextDateOfBirth!!, DateRule())
        } catch (e: Exception) {
            e.printStackTrace()
        }

        mValidator!!.validate()
    }

    fun selectManualToggle() {
        radioGroup!!.check(R.id.radioButtonManual)
    }


    override fun onAttach(context: Context) {
        super.onAttach(context)
        val activity = activity
        if (activity is SelectionFragment.SelectionFragmentListener) {
            selectionFragmentListener = activity
        }
    }

    override fun onDetach() {
        selectionFragmentListener = null
        super.onDetach()

    }

    override fun onDestroyView() {

        if (!disposable.isDisposed) {
            disposable.dispose()
        }
        binding = null
        super.onDestroyView()
    }


    override fun onValidationSucceeded() {

        val documentNumber = appCompatEditTextDocumentNumber!!.text!!.toString()
        val dateOfBirth = appCompatEditTextDateOfBirth!!.text!!.toString()
        val documentExpiration = appCompatEditTextDocumentExpiration!!.text!!.toString()

        val mrzInfo = MRZInfo("P",
                "ESP",
                "DUMMY",
                "DUMMY",
                documentNumber,
                "ESP",
                dateOfBirth,
                Gender.MALE,
                documentExpiration,
                "DUMMY"
        )
        if (selectionFragmentListener != null) {
            selectionFragmentListener!!.onPassportRead(mrzInfo)
        }
    }

    override fun onValidationFailed(errors: List<ValidationError>) {
        for (error in errors) {
            val view = error.view
            val message = error.getCollatedErrorMessage(context)

            // Display error messages ;)
            if (view is EditText) {
                view.error = message
            } else {
                Toast.makeText(context, message, Toast.LENGTH_SHORT).show()
            }
        }
    }

    ////////////////////////////////////////////////////////////////////////////////////////
    //
    //        Listener
    //
    ////////////////////////////////////////////////////////////////////////////////////////

    interface SelectionFragmentListener {
        fun onPassportRead(mrzInfo: MRZInfo)
        fun onMrzRequest()
    }


    ////////////////////////////////////////////////////////////////////////////////////////
    //
    //        Download Master List Spanish Certificates
    //
    ////////////////////////////////////////////////////////////////////////////////////////


    fun requireDownloadCSCA(){
        val downloadsFolder = requireContext().getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS)!!
        val keyStore = KeyStoreUtils().readKeystoreFromFile(downloadsFolder)
        if(keyStore==null || keyStore.aliases().toList().isNullOrEmpty()){
            //No certificates downloaded
            downloadSpanishMasterList()
        } else{
            //Certificates in the keystore
            val dialog = AlertDialog.Builder(requireContext())
                    .setTitle(R.string.keystore_not_empty_title)
                    .setMessage(R.string.keystore_not_empty_message)
                    .setPositiveButton(android.R.string.ok, object : DialogInterface.OnClickListener {
                        override fun onClick(dialog: DialogInterface?, which: Int) {
                            val subscribe = cleanCSCAFolder()
                                    .subscribeOn(Schedulers.io())
                                    .observeOn(AndroidSchedulers.mainThread())
                                    .subscribe { result ->
                                        downloadSpanishMasterList()
                                    }
                            disposable.add(subscribe)

                        }
                    })
                    .setNegativeButton(android.R.string.cancel, object : DialogInterface.OnClickListener {
                        override fun onClick(dialog: DialogInterface?, which: Int) {
                            //WE don't do anything
                        }

                    })
                    .create()
            dialog.show()
        }
    }

    fun cleanCSCAFolder():Single<Boolean>{
        return Single.fromCallable {
            try {
                val downloadsFolder = requireContext().getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS)!!
                val listFiles = downloadsFolder.listFiles()
                for (tempFile in listFiles) {
                    tempFile.delete()
                }
                val listFiles1 = downloadsFolder.listFiles()
                true
            }catch (e:java.lang.Exception){
                false
            }
        }
    }

    fun downloadSpanishMasterList(){
        val masterListService = MasterListService(requireContext(), "https://www.dnielectronico.es/")
        val subscribe = masterListService.getSpanishMasterList()
                .subscribeOn(Schedulers.io())
                .observeOn(AndroidSchedulers.mainThread())
                .subscribe(
                        { certificates ->
                            saveCertificates(certificates)
                        },
                        {error->
                            Toast.makeText(requireContext(), "No certificates has been download "+error, Toast.LENGTH_SHORT).show()
                        }
                )
        disposable.add(subscribe)
    }

    fun saveCertificates(certificates:ArrayList<Certificate>){
        val subscribe = Single.fromCallable {
            try {
                val size = certificates.size
                Log.d(TAG, "Number of certificates: " + size)
                val map = KeyStoreUtils().toMap(certificates)
                val downloadsFolder = requireContext().getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS)!!
                KeyStoreUtils().toKeyStoreFile(map, outputDir = downloadsFolder)
                size
            } catch (e: java.lang.Exception) {
                e.printStackTrace()
                -1
            }
        }.subscribeOn(Schedulers.io())
                .observeOn(AndroidSchedulers.mainThread())
                .subscribe { result ->
                    if(result>0) {
                        Toast.makeText(requireContext(), "Certificates Downloaded: "+result, Toast.LENGTH_SHORT).show()
                    } else {
                        Toast.makeText(requireContext(), "No certificates has been download", Toast.LENGTH_SHORT).show()
                    }
                }
        disposable.add(subscribe)
    }

    companion object {
        val TAG = SelectionFragment::class.java.simpleName
        init {
            Security.insertProviderAt(org.spongycastle.jce.provider.BouncyCastleProvider(), 1)
        }
        fun newInstance(mrzInfo: MRZInfo, face: Bitmap): PassportDetailsFragment {
            val myFragment = PassportDetailsFragment()
            val args = Bundle()
            myFragment.arguments = args
            return myFragment
        }
    }
}
