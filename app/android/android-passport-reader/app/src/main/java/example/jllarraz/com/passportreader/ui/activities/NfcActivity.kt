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
import android.util.Log

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
        Log.d(TAG, "onCreate: Starting NfcActivity")
        setContentView(R.layout.activity_nfc)
        val intent = intent
        if (intent.hasExtra(IntentData.KEY_MRZ_INFO)) {
            mrzInfo = intent.getSerializableExtra(IntentData.KEY_MRZ_INFO) as MRZInfo
            Log.d(TAG, "onCreate: MRZ info loaded successfully")
        } else {
            Log.e(TAG, "onCreate: Missing MRZ info, going back")
            onBackPressed()
        }

        nfcAdapter = NfcAdapter.getDefaultAdapter(this)
        Log.d(TAG, "onCreate: NFC adapter initialized - adapter: $nfcAdapter")

        if (nfcAdapter == null) {
            Log.e(TAG, "onCreate: No NFC adapter available on device")
            Toast.makeText(this, getString(R.string.warning_no_nfc), Toast.LENGTH_SHORT).show()
            finish()
            return
        }

        Log.d(TAG, "onCreate: NFC adapter state - isEnabled: ${nfcAdapter!!.isEnabled}, isNdefPushEnabled: ${nfcAdapter!!.isNdefPushEnabled}")

        pendingIntent = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            PendingIntent.getActivity(this, 0, Intent(this, javaClass).addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP), PendingIntent.FLAG_MUTABLE)
        } else{
            PendingIntent.getActivity(this, 0, Intent(this, javaClass).addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP), 0)
        }
        Log.d(TAG, "onCreate: PendingIntent created: $pendingIntent")


        if (null == savedInstanceState) {
            Log.d(TAG, "onCreate: Creating new NfcFragment")
            supportFragmentManager.beginTransaction()
                    .replace(R.id.container, NfcFragment.newInstance(mrzInfo!!), TAG_NFC)
                    .commit()
        } else {
            Log.d(TAG, "onCreate: Restoring from saved state")
        }
    }

    public override fun onResume() {
        super.onResume()
        Log.d(TAG, "onResume: Activity resumed")
        if (nfcAdapter != null) {
            Log.d(TAG, "onResume: NFC adapter state - isEnabled: ${nfcAdapter!!.isEnabled}")
        }
    }

    public override fun onPause() {
        super.onPause()
        Log.d(TAG, "onPause: Activity paused")
    }

    public override fun onNewIntent(intent: Intent) {
        Log.d(TAG, "onNewIntent: Received intent with action: ${intent.action}")
        Log.d(TAG, "onNewIntent: Intent extras: ${intent.extras}")
        if (NfcAdapter.ACTION_TAG_DISCOVERED == intent.action || NfcAdapter.ACTION_TECH_DISCOVERED == intent.action) {
            Log.d(TAG, "onNewIntent: NFC tag detected, handling intent")
            // drop NFC events
            handleIntent(intent)
        }else{
            Log.d(TAG, "onNewIntent: Non-NFC intent, delegating to super")
            super.onNewIntent(intent)
        }
    }

    protected fun handleIntent(intent: Intent) {
        Log.d(TAG, "handleIntent: Looking for NFC fragment")
        val fragmentByTag = supportFragmentManager.findFragmentByTag(TAG_NFC)
        Log.d(TAG, "handleIntent: Found fragment: $fragmentByTag")
        if (fragmentByTag is NfcFragment) {
            Log.d(TAG, "handleIntent: Delegating to NfcFragment.handleNfcTag")
            fragmentByTag.handleNfcTag(intent)
        } else {
            Log.w(TAG, "handleIntent: NfcFragment not found or wrong type")
        }
    }


    /////////////////////////////////////////////////////
    //
    //  NFC Fragment events
    //
    /////////////////////////////////////////////////////

    override fun onEnableNfc() {
        Log.d(TAG, "onEnableNfc: Called by fragment")

        if (nfcAdapter != null) {
            Log.d(TAG, "onEnableNfc: NFC adapter available, checking if enabled")
            Log.d(TAG, "onEnableNfc: NFC adapter state - isEnabled: ${nfcAdapter!!.isEnabled}")

            if (!nfcAdapter!!.isEnabled) {
                Log.w(TAG, "onEnableNfc: NFC is disabled, showing wireless settings")
                showWirelessSettings()
            } else {
                Log.d(TAG, "onEnableNfc: NFC is enabled")
            }

            try {
                Log.d(TAG, "onEnableNfc: Enabling foreground dispatch")
                nfcAdapter!!.enableForegroundDispatch(this, pendingIntent, null, null)
                Log.d(TAG, "onEnableNfc: Foreground dispatch enabled successfully")
            } catch (e: Exception) {
                Log.e(TAG, "onEnableNfc: Error enabling foreground dispatch", e)
            }
        } else {
            Log.e(TAG, "onEnableNfc: NFC adapter is null")
        }
    }

    override fun onDisableNfc() {
        Log.d(TAG, "onDisableNfc: Called by fragment")
        val nfcAdapter = NfcAdapter.getDefaultAdapter(this)
        if (nfcAdapter != null) {
            try {
                Log.d(TAG, "onDisableNfc: Disabling foreground dispatch")
                nfcAdapter.disableForegroundDispatch(this)
                Log.d(TAG, "onDisableNfc: Foreground dispatch disabled successfully")
            } catch (e: Exception) {
                Log.e(TAG, "onDisableNfc: Error disabling foreground dispatch", e)
            }
        } else {
            Log.e(TAG, "onDisableNfc: NFC adapter is null")
        }
    }

    override fun onPassportRead(passport: Passport?) {
        Log.d(TAG, "onPassportRead: Passport read successfully: $passport")
        showFragmentDetails(passport!!)
    }

    override fun onCardException(cardException: Exception?) {
        Log.e(TAG, "onCardException: Card exception occurred", cardException)
        //Toast.makeText(this, cardException.toString(), Toast.LENGTH_SHORT).show();
        //onBackPressed();
    }

    private fun showWirelessSettings() {
        Log.d(TAG, "showWirelessSettings: Opening wireless settings")
        Toast.makeText(this, getString(R.string.warning_enable_nfc), Toast.LENGTH_SHORT).show()
        val intent = Intent(Settings.ACTION_WIRELESS_SETTINGS)
        startActivity(intent)
    }


    private fun showFragmentDetails(passport: Passport) {
        Log.d(TAG, "showFragmentDetails: Showing passport details")
        supportFragmentManager.beginTransaction()
                .replace(R.id.container, PassportDetailsFragment.newInstance(passport))
                .addToBackStack(TAG_PASSPORT_DETAILS)
                .commit()
    }

    private fun showFragmentPhoto(bitmap: Bitmap) {
        Log.d(TAG, "showFragmentPhoto: Showing passport photo")
        supportFragmentManager.beginTransaction()
                .replace(R.id.container, PassportPhotoFragment.newInstance(bitmap))
                .addToBackStack(TAG_PASSPORT_PICTURE)
                .commit()
    }


    override fun onImageSelected(bitmap: Bitmap?) {
        Log.d(TAG, "onImageSelected: Image selected")
        showFragmentPhoto(bitmap!!)
    }

    companion object {

        private val TAG = NfcActivity::class.java.simpleName


        private val TAG_NFC = "TAG_NFC"
        private val TAG_PASSPORT_DETAILS = "TAG_PASSPORT_DETAILS"
        private val TAG_PASSPORT_PICTURE = "TAG_PASSPORT_PICTURE"
    }
}
