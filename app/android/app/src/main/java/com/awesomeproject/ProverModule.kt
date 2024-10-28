package com.proofofpassportapp.prover

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Promise

import android.util.Log
import android.content.Context
import java.io.ByteArrayOutputStream
import com.facebook.react.bridge.ReadableMap

import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

import com.google.gson.Gson
import com.google.gson.GsonBuilder

import com.proofofpassportapp.R

import java.io.File
import java.io.FileInputStream
import java.io.IOException

class ProverModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
  private val TAG = "ProverModule"

  override fun getName(): String {
    return "Prover"
  }

  @ReactMethod
  fun runProveAction(zkey_path: String, witness_calculator: String, dat_file_path: String, inputs: ReadableMap, promise: Promise) {
    Log.e(TAG, "zkey_path in provePassport kotlin: $zkey_path")
    Log.e(TAG, "witness_calculator in provePassport kotlin: $witness_calculator")
    Log.e(TAG, "dat_file_path in provePassport kotlin: $dat_file_path")
    Log.e(TAG, "inputs in provePassport kotlin: ${inputs.toString()}")

    // Read the dat file from the provided filesystem path
    val datFile = File(dat_file_path)
    if (!datFile.exists()) {
        Log.e(TAG, "Dat file does not exist at path: $dat_file_path")
        throw IllegalArgumentException("Dat file does not exist at path: $dat_file_path")
    }

    val datBytes: ByteArray
    try {
        datBytes = datFile.readBytes()
    } catch (e: IOException) {
        Log.e(TAG, "Error reading dat file: ${e.message}")
        throw IllegalArgumentException("Error reading dat file: ${e.message}")
    }

    val formattedInputs = mutableMapOf<String, Any?>()

    val iterator = inputs.keySetIterator()
    while (iterator.hasNextKey()) {
        val key = iterator.nextKey()
        val array = inputs.getArray(key)?.toArrayList()?.map { it.toString() }
        formattedInputs[key] = if (array?.size == 1) array.firstOrNull() else array
    }

    val gson = GsonBuilder().setPrettyPrinting().create()
    Log.e(TAG, gson.toJson(formattedInputs))

    // (used to be) working example
    // val inputs = mutableMapOf<String, List<String>>(
    //   "mrz" to listOf("97","91","95","31","88","80","60","70","82","65","84","65","86","69","82","78","73","69","82","60","60","70","76","79","82","69","78","84","60","72","85","71","85","69","83","60","74","69","65","78","60","60","60","60","60","60","60","60","60","49","57","72","65","51","52","56","50","56","52","70","82","65","48","48","48","55","49","57","49","77","50","57","49","50","48","57","53","60","60","60","60","60","60","60","60","60","60","60","60","60","60","48","50"),
    //   "reveal_bitmap" to listOf("0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0"),
    //   "dataHashes" to listOf("48","130","1","37","2","1","0","48","11","6","9","96","134","72","1","101","3","4","2","1","48","130","1","17","48","37","2","1","1","4","32","99","19","179","205","55","104","45","214","133","101","233","177","130","1","37","89","125","229","139","34","132","146","28","116","248","186","63","195","96","151","26","215","48","37","2","1","2","4","32","63","234","106","78","31","16","114","137","237","17","92","71","134","47","62","78","189","233","201","213","53","4","47","189","201","133","6","121","34","131","64","142","48","37","2","1","3","4","32","136","155","87","144","121","15","152","127","85","25","154","80","20","58","51","75","193","116","234","0","60","30","29","30","183","141","72","247","255","203","100","124","48","37","2","1","11","4","32","0","194","104","108","237","246","97","230","116","198","69","110","26","87","17","89","110","199","108","250","36","21","39","87","110","102","250","213","174","131","171","174","48","37","2","1","12","4","32","190","82","180","235","222","33","79","50","152","136","142","35","116","224","6","242","156","141","128","247","10","61","98","86","248","45","207","210","90","232","175","38","48","37","2","1","13","4","32","91","222","210","193","63","222","104","82","36","41","138","253","70","15","148","208","156","45","105","171","241","195","185","43","217","162","146","201","222","89","238","38","48","37","2","1","14","4","32","76","123","216","13","52","227","72","245","59","193","238","166","103","49","24","164","171","188","194","197","156","187","249","28","198","95","69","15","182","56","54","38","128","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","9","72"),
    //   "datahashes_padded_length" to listOf("320"),
    //   "eContentBytes" to listOf("49","102","48","21","6","9","42","134","72","134","247","13","1","9","3","49","8","6","6","103","129","8","1","1","1","48","28","6","9","42","134","72","134","247","13","1","9","5","49","15","23","13","49","57","49","50","49","54","49","55","50","50","51","56","90","48","47","6","9","42","134","72","134","247","13","1","9","4","49","34","4","32","176","96","59","213","131","82","89","248","105","125","37","177","158","162","137","43","13","39","115","6","59","229","81","110","49","75","255","184","155","73","116","86"),
    //   "signature" to listOf("1004979219314799894","6361443755252600907","6439012883494616023","9400879716815088139","17551897985575934811","11779273958797828281","2536315921873401485","3748173260178203981","12475215309213288577","6281117468118442715","1336292932993922350","14238156234566069988","11985045093510507012","3585865343992378960","16170829868787473084","17039645001628184779","486540501180074772","5061439412388381188","12478821212163933993","7430448406248319432","746345521572597865","5002454658692185142","3715069341922830389","11010599232161942094","1577500614971981868","13656226284809645063","3918261659477120323","5578832687955645075","3416933977282345392","15829829506526117610","17465616637242519010","6519177967447716150"),
    //   "signatureAlgorithm" to listOf("1"),
    //   "pubkey" to listOf("9539992759301679521","1652651398804391575","7756096264856639170","15028348881266521487","13451582891670014060","11697656644529425980","14590137142310897374","1172377360308996086","6389592621616098288","6767780215543232436","11347756978427069433","2593119277386338350","18385617576997885505","14960211320702750252","8706817324429498800","15168543370367053559","8708916123725550363","18006178692029805686","6398208271038376723","15000821494077560096","17674982305626887153","2867958270953137726","9287774520059158342","9813100051910281130","13494313215150203208","7792741716144106392","6553490305289731807","32268224696386820","15737886769048580611","669518601007982974","11424760966478363403","16073833083611347461"),
    //   "pathIndices" to listOf("0","1","1","1","1","1","1","0","1","1","0","0","1","1","0","0"),
    //   "siblings" to listOf("20516282398390866580647417962347415258712802604212003365416596890852644939364","20547289806543281108128197867250295423223489766069952889766689677695750842294","17092860852967512812593771487649838995106203215624858397482169733546970246117","19141872343555753276227561835732941623954902346285308564941039231845690663515","2888260764701592030713638283446165050628606750519377550369633789586724212406","17037943129534065359096662792322618985598809624384219749636863003643326502177","21260541151470016589788332273091943678373855676584683193443363340566713593750","9681119423869145671286918102040570804786474221694907866875171055859965502010","3999714159260652982057321310481110903729446356195536109316994934664982988519","14359042263488593594514913785064471775842285148703143594475594381078274944550","10696856845043652409316424831381338144209147199074363427177722046972515079299","2796323689030312622891330190155708704921773618732461037692992858528069077360","1379184643939692456020535864077563679018059205165852146212742699309755722087","17834317267514482863629341626611816587254867008433493508231639322166589549456","1473918712602583605383280948484316645101117513102582419100942131704211814519","15819538789928229930262697811477882737253464456578333862691129291651619515538"),
    //   "root" to listOf("4080578225172475068086778061870548445929343471785864518431540330127324371840"),
    //   "address" to listOf("642829559307850963015472508762062935916233390536")
    // )


    val jsonInputs = gson.toJson(formattedInputs).toByteArray()
    val zkpTools = ZKPTools(reactApplicationContext)

    val witnessCalcFunction = when (witness_calculator) {
        "prove_rsa_65537_sha256" -> zkpTools::witnesscalc_prove_rsa_65537_sha256
        "prove_rsa_65537_sha1" -> zkpTools::witnesscalc_prove_rsa_65537_sha1
        "prove_rsapss_65537_sha256" -> zkpTools::witnesscalc_prove_rsapss_65537_sha256
        "vc_and_disclose" -> zkpTools::witnesscalc_vc_and_disclose
        else -> throw IllegalArgumentException("Invalid witness calculator name")
    }  
    
    val zkp: ZkProof = ZKPUseCase(reactApplicationContext).generateZKP(
        zkey_path,
        datBytes,
        jsonInputs,
        witnessCalcFunction
    )

    Log.e("ZKP", gson.toJson(zkp))

    promise.resolve(zkp.toString())
  }
}


data class Proof(
    val pi_a: List<String>,
    val pi_b: List<List<String>>,
    val pi_c: List<String>,
    val protocol: String,
    var curve: String = "bn128"
) {
    companion object {
        fun fromJson(jsonString: String): Proof {
            Log.d("Proof", jsonString)
            val json = Gson().fromJson(jsonString, Proof::class.java)
            json.curve = getDefaultCurve()
            return json
        }

        private fun getDefaultCurve(): String {
            return "bn128"
        }
    }
}

data class ZkProof(
    val proof: Proof,
    val pub_signals: List<String>
)

class ZKPTools(val context: Context) {
//   external fun witnesscalc_register_sha256WithRSAEncryption_65537(circuitBuffer: ByteArray,
//     circuitSize: Long,
//     jsonBuffer: ByteArray,
//     jsonSize: Long,
//     wtnsBuffer: ByteArray,
//     wtnsSize: LongArray,
//     errorMsg: ByteArray,
//     errorMsgMaxSize: Long): Int
//   external fun witnesscalc_disclose(circuitBuffer: ByteArray,
//     circuitSize: Long,
//     jsonBuffer: ByteArray,
//     jsonSize: Long,
//     wtnsBuffer: ByteArray,
//     wtnsSize: LongArray,
//     errorMsg: ByteArray,
//     errorMsgMaxSize: Long): Int
  external fun witnesscalc_prove_rsa_65537_sha256(circuitBuffer: ByteArray,
    circuitSize: Long,
    jsonBuffer: ByteArray,
    jsonSize: Long,
    wtnsBuffer: ByteArray,
    wtnsSize: LongArray,
    errorMsg: ByteArray,
    errorMsgMaxSize: Long): Int
  external fun witnesscalc_prove_rsa_65537_sha1(circuitBuffer: ByteArray,
    circuitSize: Long,
    jsonBuffer: ByteArray,
    jsonSize: Long,
    wtnsBuffer: ByteArray,
    wtnsSize: LongArray,
    errorMsg: ByteArray,
    errorMsgMaxSize: Long): Int
  external fun witnesscalc_prove_rsapss_65537_sha256(circuitBuffer: ByteArray,
    circuitSize: Long,
    jsonBuffer: ByteArray,
    jsonSize: Long,
    wtnsBuffer: ByteArray,
    wtnsSize: LongArray,
    errorMsg: ByteArray,
    errorMsgMaxSize: Long): Int
  external fun witnesscalc_vc_and_disclose(circuitBuffer: ByteArray,
    circuitSize: Long,
    jsonBuffer: ByteArray,
    jsonSize: Long,
    wtnsBuffer: ByteArray,
    wtnsSize: LongArray,
    errorMsg: ByteArray,
    errorMsgMaxSize: Long): Int

//   external fun witnesscalc_prove_ecdsa_secp256r1_sha1(circuitBuffer: ByteArray,
//     circuitSize: Long,
//     jsonBuffer: ByteArray,
//     jsonSize: Long,
//     wtnsBuffer: ByteArray,
//     wtnsSize: LongArray,
//     errorMsg: ByteArray,
//     errorMsgMaxSize: Long): Int
//   external fun witnesscalc_prove_ecdsa_secp256r1_sha256(circuitBuffer: ByteArray,
//     circuitSize: Long,
//     jsonBuffer: ByteArray,
//     jsonSize: Long,
//     wtnsBuffer: ByteArray,
//     wtnsSize: LongArray,
//     errorMsg: ByteArray,
//     errorMsgMaxSize: Long): Int
  external fun groth16_prover(
      zkeyBuffer: ByteArray, zkeySize: Long,
      wtnsBuffer: ByteArray, wtnsSize: Long,
      proofBuffer: ByteArray, proofSize: LongArray,
      publicBuffer: ByteArray, publicSize: LongArray,
      errorMsg: ByteArray, errorMsgMaxSize: Long
  ): Int
  external fun groth16_prover_zkey_file(
      zkeyPath: String,
      wtnsBuffer: ByteArray, wtnsSize: Long,
      proofBuffer: ByteArray, proofSize: LongArray,
      publicBuffer: ByteArray, publicSize: LongArray,
      errorMsg: ByteArray, errorMsgMaxSize: Long
  ): Int

  init {
      System.loadLibrary("rapidsnark");
      System.loadLibrary("proofofpassportapp")
  }

  fun openRawResourceAsByteArray(resourceName: Int): ByteArray {
      val inputStream = context.resources.openRawResource(resourceName)
      val byteArrayOutputStream = ByteArrayOutputStream()

      try {
          val buffer = ByteArray(1024)
          var length: Int

          while (inputStream.read(buffer).also { length = it } != -1) {
              byteArrayOutputStream.write(buffer, 0, length)
          }

          return byteArrayOutputStream.toByteArray()
      } finally {
          byteArrayOutputStream.close()
          inputStream.close()
      }
  }
}

class ZKPUseCase(val context: Context) {

    fun generateZKP(
        zkey_path: String,
        datBytes: ByteArray,
        inputs: ByteArray,
        proofFunction: (
            circuitBuffer: ByteArray,
            circuitSize: Long,
            jsonBuffer: ByteArray,
            jsonSize: Long,
            wtnsBuffer: ByteArray,
            wtnsSize: LongArray,
            errorMsg: ByteArray,
            errorMsgMaxSize: Long
        ) -> Int
    ): ZkProof {
        val zkpTool = ZKPTools(context)
        val datFile = datBytes

        val msg = ByteArray(256)

        val witnessLen = LongArray(1)
        witnessLen[0] = 100 * 1024 * 1024

        val byteArr = ByteArray(100 * 1024 * 1024)

        val res = proofFunction(
            datFile,
            datFile.size.toLong(),
            inputs,
            inputs.size.toLong(),
            byteArr,
            witnessLen,
            msg,
            256
        )

        Log.e("ZKPUseCase", "Witness gen res: $res")
        Log.e("ZKPUseCase", "Witness gen return length: ${byteArr.size}")

        if (res == 3) {
            throw Exception("Error 3")
        }

        if (res == 2) {
            throw Exception("Not enough memory for zkp")
        }

        if (res == 1) {
            throw Exception("Error during zkp ${msg.decodeToString()}")
        }

        val pubData = ByteArray(4 *1024 *1024)
        val pubLen = LongArray(1)
        pubLen[0] = pubData.size.toLong()

        val proofData = ByteArray(4*1024*1024)
        val proofLen = LongArray(1)
        proofLen[0] = proofData.size.toLong()

        val witnessData = byteArr.copyOfRange(0, witnessLen[0].toInt())

        Log.e("ZKPUseCase", "zkey_path: $zkey_path")

        val proofGen = zkpTool.groth16_prover_zkey_file(
            zkey_path,
            witnessData,
            witnessLen[0],
            proofData,
            proofLen,
            pubData,
            pubLen,
            msg,
            256
        )

        Log.e("ZKPUseCase", "proofGen res: $proofGen")

        if (proofGen == 2) {
            throw Exception("Not enough memory for proofGen ${msg.decodeToString()}")
        }

        if (proofGen == 1) {
            throw Exception("Error during proofGen ${msg.decodeToString()}")
        }

        val proofDataZip = proofData.copyOfRange(0, proofLen[0].toInt())

        val index = findLastIndexOfSubstring(
            proofDataZip.toString(Charsets.UTF_8),
            "\"protocol\":\"groth16\"}"
        )
        val indexPubData = findLastIndexOfSubstring(
            pubData.decodeToString(),
            "]"
        )

        val formattedPubData = pubData.decodeToString().slice(0..indexPubData)

        val formattedProof = proofDataZip.toString(Charsets.UTF_8).slice(0..index)

        Log.e("ZKPUseCase", "formattedProof: $formattedProof")

        val proof = Proof.fromJson(formattedProof)

        Log.e("ZKPUseCase", "Proof: $proof")

        return ZkProof(
            proof = proof,
            pub_signals = getPubSignals(formattedPubData).toList()
        )
    }

    private fun findLastIndexOfSubstring(mainString: String, searchString: String): Int {
        val index = mainString.lastIndexOf(searchString)

        if (index != -1) {
            // If substring is found, calculate the last index of the substring
            return index + searchString.length - 1
        }

        return -1
    }

    private fun getPubSignals(jsonString: String): List<String> {
        val gson = Gson()
        val stringArray = gson.fromJson(jsonString, Array<String>::class.java)
        return stringArray.toList()
    }
}

