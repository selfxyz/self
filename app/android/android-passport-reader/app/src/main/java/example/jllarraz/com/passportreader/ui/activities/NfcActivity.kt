package example.jllarraz.com.passportreader.ui.activities

import android.app.PendingIntent
import android.content.Intent
import android.graphics.Bitmap
import android.nfc.NfcAdapter
import android.os.Build
import android.os.Bundle
import android.provider.Settings
import androidx.fragment.app.Fragment
import androidx.fragment.app.FragmentActivity
import android.widget.Toast

import net.sf.scuba.smartcards.CardServiceException


import org.jmrtd.lds.icao.MRZInfo

import example.jllarraz.com.passportreader.R
import example.jllarraz.com.passportreader.common.IntentData
import example.jllarraz.com.passportreader.data.Passport
import example.jllarraz.com.passportreader.ui.fragments.NfcFragment
import example.jllarraz.com.passportreader.ui.fragments.PassportDetailsFragment
import example.jllarraz.com.passportreader.ui.fragments.PassportPhotoFragment

import example.jllarraz.com.passportreader.common.IntentData.KEY_MRZ_INFO

class NfcActivity : androidx.fragment.app.FragmentActivity(), NfcFragment.NfcFragmentListener, PassportDetailsFragment.PassportDetailsFragmentListener, PassportPhotoFragment.PassportPhotoFragmentListener {

    private var mrzInfo: MRZInfo? = null

    private var nfcAdapter: NfcAdapter? = null
    private var pendingIntent: PendingIntent? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_nfc)
        val intent = intent
        if (intent.hasExtra(IntentData.KEY_MRZ_INFO)) {
            mrzInfo = intent.getSerializableExtra(IntentData.KEY_MRZ_INFO) as MRZInfo
        } else {
            onBackPressed()
        }

        nfcAdapter = NfcAdapter.getDefaultAdapter(this)

        if (nfcAdapter == null) {
            Toast.makeText(this, getString(R.string.warning_no_nfc), Toast.LENGTH_SHORT).show()
            finish()
            return
        }

        pendingIntent = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            PendingIntent.getActivity(this, 0, Intent(this, javaClass).addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP), PendingIntent.FLAG_MUTABLE)
        } else{
            PendingIntent.getActivity(this, 0, Intent(this, javaClass).addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP), 0)
        }


        if (null == savedInstanceState) {
            supportFragmentManager.beginTransaction()
                    .replace(R.id.container, NfcFragment.newInstance(mrzInfo!!), TAG_NFC)
                    .commit()
        }
    }

    public override fun onResume() {
        super.onResume()

    }

    public override fun onPause() {
        super.onPause()

    }

    public override fun onNewIntent(intent: Intent) {
        if (NfcAdapter.ACTION_TAG_DISCOVERED == intent.action || NfcAdapter.ACTION_TECH_DISCOVERED == intent.action) {
            // drop NFC events
            handleIntent(intent)
        }else{
            super.onNewIntent(intent)
        }
    }

    protected fun handleIntent(intent: Intent) {
        val fragmentByTag = supportFragmentManager.findFragmentByTag(TAG_NFC)
        if (fragmentByTag is NfcFragment) {
            fragmentByTag.handleNfcTag(intent)
        }
    }


    /////////////////////////////////////////////////////
    //
    //  NFC Fragment events
    //
    /////////////////////////////////////////////////////

    override fun onEnableNfc() {


        if (nfcAdapter != null) {
            if (!nfcAdapter!!.isEnabled)
                showWirelessSettings()

            nfcAdapter!!.enableForegroundDispatch(this, pendingIntent, null, null)
        }
    }

    override fun onDisableNfc() {
        val nfcAdapter = NfcAdapter.getDefaultAdapter(this)
        nfcAdapter.disableForegroundDispatch(this)
    }

    override fun onPassportRead(passport: Passport?) {
        showFragmentDetails(passport!!)
    }

    override fun onCardException(cardException: Exception?) {
        //Toast.makeText(this, cardException.toString(), Toast.LENGTH_SHORT).show();
        //onBackPressed();
    }

    private fun showWirelessSettings() {
        Toast.makeText(this, getString(R.string.warning_enable_nfc), Toast.LENGTH_SHORT).show()
        val intent = Intent(Settings.ACTION_WIRELESS_SETTINGS)
        startActivity(intent)
    }


    private fun showFragmentDetails(passport: Passport) {
        supportFragmentManager.beginTransaction()
                .replace(R.id.container, PassportDetailsFragment.newInstance(passport))
                .addToBackStack(TAG_PASSPORT_DETAILS)
                .commit()
    }

    private fun showFragmentPhoto(bitmap: Bitmap) {
        supportFragmentManager.beginTransaction()
                .replace(R.id.container, PassportPhotoFragment.newInstance(bitmap))
                .addToBackStack(TAG_PASSPORT_PICTURE)
                .commit()
    }


    override fun onImageSelected(bitmap: Bitmap?) {
        showFragmentPhoto(bitmap!!)
    }

    companion object {

        private val TAG = NfcActivity::class.java.simpleName


        private val TAG_NFC = "TAG_NFC"
        private val TAG_PASSPORT_DETAILS = "TAG_PASSPORT_DETAILS"
        private val TAG_PASSPORT_PICTURE = "TAG_PASSPORT_PICTURE"
    }
}
