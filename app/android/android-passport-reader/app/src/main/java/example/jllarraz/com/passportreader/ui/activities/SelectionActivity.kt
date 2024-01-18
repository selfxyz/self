/*
 * Copyright 2017 The Android Open Source Project
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *       http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package example.jllarraz.com.passportreader.ui.activities


import android.app.Activity
import android.content.Intent
import android.os.Bundle
import androidx.appcompat.app.AppCompatActivity
import example.jllarraz.com.passportreader.R
import example.jllarraz.com.passportreader.common.IntentData
import example.jllarraz.com.passportreader.ui.fragments.SelectionFragment
import org.jmrtd.lds.icao.MRZInfo

class SelectionActivity : AppCompatActivity(), SelectionFragment.SelectionFragmentListener {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_camera)
        if (null == savedInstanceState) {
            supportFragmentManager.beginTransaction()
                    .replace(R.id.container, SelectionFragment(), TAG_SELECTION_FRAGMENT)
                    .commit()
        }
    }


    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        var data = data
        if (data == null) {
            data = Intent()
        }
        when (requestCode) {
            REQUEST_MRZ -> {
                when (resultCode) {
                    Activity.RESULT_OK -> {
                        onPassportRead(data.getSerializableExtra(IntentData.KEY_MRZ_INFO) as MRZInfo)
                    }
                    Activity.RESULT_CANCELED -> {
                        val fragmentByTag = supportFragmentManager.findFragmentByTag(TAG_SELECTION_FRAGMENT)
                        if (fragmentByTag is SelectionFragment) {
                            fragmentByTag.selectManualToggle()
                        }
                    }
                    else -> {
                        val fragmentByTag = supportFragmentManager.findFragmentByTag(TAG_SELECTION_FRAGMENT)
                        if (fragmentByTag is SelectionFragment) {
                            fragmentByTag.selectManualToggle()
                        }
                    }
                }
            }
            REQUEST_NFC -> {
                val fragmentByTag = supportFragmentManager.findFragmentByTag(TAG_SELECTION_FRAGMENT)
                if (fragmentByTag is SelectionFragment) {
                    fragmentByTag.selectManualToggle()
                }
            }
        }
        super.onActivityResult(requestCode, resultCode, data)
    }

    private fun test() {
        //Method to test NFC without rely into the Camera
        val TEST_LINE_1 = "P<IRLOSULLIVAN<<LAUREN<<<<<<<<<<<<<<<<<<<<<<"
        val TEST_LINE_2 = "XN50042162IRL8805049F2309154<<<<<<<<<<<<<<<6"

        val mrzInfo = MRZInfo(TEST_LINE_1 + "\n" + TEST_LINE_2)
        onPassportRead(mrzInfo)
    }

    override fun onPassportRead(mrzInfo: MRZInfo) {
        val intent = Intent(this, NfcActivity::class.java)
        intent.putExtra(IntentData.KEY_MRZ_INFO, mrzInfo)
        startActivityForResult(intent, REQUEST_NFC)
    }

    override fun onMrzRequest() {
        val intent = Intent(this, CameraActivity::class.java)
        startActivityForResult(intent, REQUEST_MRZ)
    }



    companion object {

        private val TAG = SelectionActivity::class.java.simpleName
        private val REQUEST_MRZ = 12
        private val REQUEST_NFC = 11

        private val TAG_SELECTION_FRAGMENT = "TAG_SELECTION_FRAGMENT"
    }
}
