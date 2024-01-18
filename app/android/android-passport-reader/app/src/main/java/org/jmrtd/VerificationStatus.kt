package org.jmrtd

import android.os.Parcel
import android.os.Parcelable

import net.sf.scuba.util.Hex

import org.jmrtd.protocol.EACCAResult
import org.jmrtd.protocol.EACTAResult

import java.io.IOException
import java.io.ObjectInputStream
import java.io.ObjectOutputStream
import java.io.Serializable
import java.security.cert.Certificate
import java.util.ArrayList
import java.util.Arrays
import java.util.TreeMap

/**
 * A data type for communicating document verification check information.
 *
 * @author The JMRTD team (info@jmrtd.org)
 *
 * @version $Revision: 1559 $
 */
class VerificationStatus : Parcelable {

    /* Verdict for this verification feature. */
    /**
     * Gets the AA verdict.
     *
     * @return the AA status
     */
    var aa: Verdict? = null
        private set
    /**
     * Gets the BAC verdict.
     *
     * @return the BAC status
     */
    var bac: Verdict? = null
        private set
    /**
     * Gets the SAC verdict.
     *
     * @return the SAC verdict
     */
    var sac: Verdict? = null
        private set
    /**
     * Gets the CS verdict.
     *
     * @return the CS status
     */
    var cs: Verdict? = null
        private set
    /**
     * Gets the hash table verdict.
     *
     * @return a verdict
     */
    var ht: Verdict? = null
        private set
    /**
     * Gets the DS verdict.
     *
     * @return the DS status
     */
    var ds: Verdict? = null
        private set
    /**
     * Gets the EAC verdict.
     *
     * @return the EAC status
     */
    var eac: Verdict? = null
        private set
    /**
     * Gets the CA verdict.
     *
     * @return the CA status
     */
    var ca: Verdict? = null
        private set

    /* Textual reason for the verdict. */
    /**
     * Gets the AA reason string.
     *
     * @return a reason string
     */
    var aaReason: String? = null
        private set
    /**
     * Gets the BAC verdict string.
     *
     * @return a verdict string
     */
    var bacReason: String? = null
        private set
    /**
     * Gets the SAC reason.
     *
     * @return a reason string
     */
    var sacReason: String? = null
        private set
    /**
     * Gets the country signature reason string.
     *
     * @return a reason string
     */
    var csReason: String? = null
        private set
    /**
     * Gets the hash table reason string.
     *
     * @return a reason string
     */
    var htReason: String? = null
        private set
    /**
     * Gets the document signature verdict reason string.
     *
     * @return a reason string
     */
    var dsReason: String? = null
        private set
    /**
     * Gets the EAC reason string.
     *
     * @return a reasons string
     */
    var eacReason: String? = null
        private set
    /**
     * Gets the CA reason string.
     *
     * @return a reasons string
     */
    var caReason: String? = null
        private set

    /* By products of the verification process that may be useful for relying parties to display. */
    private var triedBACEntries: List<BACKey>? = null /* As a result of BAC testing, this contains all tried BAC entries. */
    var hashResults: MutableMap<Int, HashMatchResult>? = null /* As a result of HT testing, this contains stored and computed hashes. */
    private var certificateChain: List<Certificate>? = null /* As a result of CS testing, this contains certificate chain from DSC to CSCA. */
    /**
     * Gets the EAC result.
     *
     * @return the EAC result
     */
    var eacResult: EACTAResult? = null
        private set
    /**
     * Gets the CA result.
     *
     * @return the CA result
     */
    var caResult: EACCAResult? = null
        private set

    /**
     * Outcome of a verification process.
     *
     * @author The JMRTD team (info@jmrtd.org)
     *
     * @version $Revision: 1559 $
     */
    enum class Verdict {
        UNKNOWN, /* Unknown */
        NOT_PRESENT, /* Not present */
        NOT_CHECKED, /* Present, not checked */
        FAILED, /* Present, checked, and not ok */
        SUCCEEDED
        /* Present, checked, and ok */
    }

    /**
     * Constructs a new status with all verdicts
     * set to UNKNOWN.
     */
    constructor() {
        setAll(Verdict.UNKNOWN, null)
    }

    /**
     * Sets the AA verdict.
     *
     * @param v the status to set
     * @param reason a reason string
     */
    fun setAA(v: Verdict, reason: String?) {
        this.aa = v
        this.aaReason = reason
    }

    /**
     * Gets the tried BAC entries.
     *
     * @return a list of BAC keys
     */
    fun getTriedBACEntries(): List<*>? {
        return triedBACEntries
    }

    /**
     * Sets the BAC verdict.
     *
     * @param v the status to set
     * @param reason a reason string
     * @param triedBACEntries the list of BAC entries that were tried
     */
    fun setBAC(v: Verdict, reason: String?, triedBACEntries: List<BACKey>?) {
        this.bac = v
        this.bacReason = reason
        this.triedBACEntries = triedBACEntries
    }

    /**
     * Sets the SAC verdict and reason string.
     *
     * @param v a verdict
     * @param reason a reason string
     */
    fun setSAC(v: Verdict, reason: String) {
        this.sac = v
        this.sacReason = reason
    }

    /**
     * Gets the certificate chain between DS and CSCA.
     *
     * @return a certificate chain
     */
    fun getCertificateChain(): List<*>? {
        return certificateChain
    }

    /**
     * Gets the CS verdict.
     *
     * @param v the status to set
     * @param reason the reason string
     * @param certificateChain the certificate chain between DS and CSCA
     */
    fun setCS(v: Verdict, reason: String?, certificateChain: List<Certificate>?) {
        this.cs = v
        this.csReason = reason
        this.certificateChain = certificateChain
    }


    /**
     * Sets the DS verdict.
     *
     * @param v the status to set
     * @param reason reason string
     */
    fun setDS(v: Verdict, reason: String?) {
        this.ds = v
        this.dsReason = reason
    }

    /**
     * Gets the hash match results.
     *
     * @return a list of hash match results
     */
    /*fun getHashResults(): MutableMap<Int, HashMatchResult>? {
        return hashResults
    }*/

    /**
     * Sets the hash table status.
     *
     * @param v a verdict
     * @param reason the reason string
     * @param hashResults the hash match results
     */
    fun setHT(v: Verdict, reason: String?, hashResults: MutableMap<Int, HashMatchResult>?) {
        this.ht = v
        this.htReason = reason
        this.hashResults = hashResults
    }

    /**
     * Sets the EAC verdict.
     *
     * @param v the status to set
     * @param eacResult the EAC result
     * @param reason reason string
     */
    fun setEAC(v: Verdict, reason: String?, eacResult: EACTAResult?) {
        this.eac = v
        this.eacReason = reason
        this.eacResult = eacResult
    }

    /**
     * Sets the CA verdict.
     *
     * @param v the status to set
     * @param eaccaResult the CA result
     * @param reason reason string
     */
    fun setCA(v: Verdict, reason: String, eaccaResult: EACCAResult?) {
        this.ca = v
        this.caReason = reason
        this.caResult = eaccaResult
    }

    /**
     * Sets all vedicts to v.
     *
     * @param verdict the status to set
     * @param reason reason string
     */
    fun setAll(verdict: Verdict, reason: String?) {
        setAA(verdict, reason)
        setBAC(verdict, reason, null)
        setCS(verdict, reason, null)
        setDS(verdict, reason)
        setHT(verdict, reason, null)
        setEAC(verdict, reason, null)
    }


    constructor(`in`: Parcel) {
        this.aa =  if (`in`.readInt() == 1) Verdict.valueOf(`in`.readString()!!)  else null
        this.bac =  if (`in`.readInt() == 1) Verdict.valueOf(`in`.readString()!!) else null
        this.sac =  if (`in`.readInt() == 1) Verdict.valueOf(`in`.readString()!!) else null
        this.cs =  if (`in`.readInt() == 1) Verdict.valueOf(`in`.readString()!!) else null
        this.ht = if (`in`.readInt() == 1) Verdict.valueOf(`in`.readString()!!) else null
        this.ds =  if (`in`.readInt() == 1) Verdict.valueOf(`in`.readString()!!) else null
        this.eac =  if (`in`.readInt() == 1) Verdict.valueOf(`in`.readString()!!) else null
        this.ca =  if (`in`.readInt() == 1) Verdict.valueOf(`in`.readString()!!) else null

        this.aaReason = if (`in`.readInt() == 1) `in`.readString() else null
        this.bacReason = if (`in`.readInt() == 1) `in`.readString() else null
        this.sacReason = if (`in`.readInt() == 1) `in`.readString() else null
        this.csReason = if (`in`.readInt() == 1) `in`.readString() else null
        this.htReason = if (`in`.readInt() == 1) `in`.readString() else null
        this.dsReason = if (`in`.readInt() == 1) `in`.readString() else null
        this.eacReason = if (`in`.readInt() == 1) `in`.readString() else null
        this.caReason = if (`in`.readInt() == 1) `in`.readString() else null

        if (`in`.readInt() == 1) {
            triedBACEntries = ArrayList()
            `in`.readList(triedBACEntries!!, BACKey::class.java.classLoader)
        }

        if (`in`.readInt() == 1) {
            hashResults = TreeMap()
            val size = `in`.readInt()
            for (i in 0 until size) {
                val key = `in`.readInt()
                val value = `in`.readSerializable() as HashMatchResult
                hashResults!![key] = value
            }
        }

        if (`in`.readInt() == 1) {
            certificateChain = ArrayList()
            `in`.readList(certificateChain!!, Certificate::class.java.classLoader)
        }

        if (`in`.readInt() == 1) {
            eacResult = `in`.readSerializable() as EACTAResult
        }

        if (`in`.readInt() == 1) {
            caResult = `in`.readSerializable() as EACCAResult
        }
    }

    override fun describeContents(): Int {
        return 0
    }

    override fun writeToParcel(dest: Parcel, flags: Int) {
        dest.writeInt(if(this.aa!=null) 1 else 0)
        if(aa!=null) {
            dest.writeString(aa?.name)
        }
        dest.writeInt(if(this.bac!=null) 1 else 0)
        if(bac!=null) {
            dest.writeString(bac?.name)
        }
        dest.writeInt(if(this.sac!=null) 1 else 0)
        if(sac!=null) {
            dest.writeString(sac?.name)
        }
        dest.writeInt(if(this.cs!=null) 1 else 0)
        if(cs!=null) {
            dest.writeString(cs?.name)
        }
        dest.writeInt(if(this.ht!=null) 1 else 0)
        if(ht!=null) {
            dest.writeString(ht?.name)
        }
        dest.writeInt(if(this.ds!=null) 1 else 0)
        if(ds!=null) {
            dest.writeString(ds?.name)
        }
        dest.writeInt(if(this.eac!=null) 1 else 0)
        if(eac!=null) {
            dest.writeString(eac?.name)
        }
        dest.writeInt(if(this.ca!=null) 1 else 0)
        if(ca!=null) {
            dest.writeString(ca?.name)
        }

        dest.writeInt(if (aaReason != null) 1 else 0)
        if (aaReason != null) {
            dest.writeString(aaReason)
        }

        dest.writeInt(if (bacReason != null) 1 else 0)
        if (bacReason != null) {
            dest.writeString(bacReason)
        }

        dest.writeInt(if (sacReason != null) 1 else 0)
        if (sacReason != null) {
            dest.writeString(sacReason)
        }

        dest.writeInt(if (csReason != null) 1 else 0)
        if (csReason != null) {
            dest.writeString(csReason)
        }

        dest.writeInt(if (htReason != null) 1 else 0)
        if (htReason != null) {
            dest.writeString(htReason)
        }

        dest.writeInt(if (dsReason != null) 1 else 0)
        if (dsReason != null) {
            dest.writeString(dsReason)
        }

        dest.writeInt(if (eacReason != null) 1 else 0)
        if (eacReason != null) {
            dest.writeString(eacReason)
        }

        dest.writeInt(if (caReason != null) 1 else 0)
        if (caReason != null) {
            dest.writeString(caReason)
        }

        dest.writeInt(if (triedBACEntries != null) 1 else 0)
        if (triedBACEntries != null) {
            dest.writeList(triedBACEntries)
        }

        dest.writeInt(if (hashResults != null) 1 else 0)
        if (hashResults != null) {
            dest.writeInt(hashResults!!.size)
            for ((key, value) in hashResults!!) {
                dest.writeInt(key)
                dest.writeSerializable(value)
            }
        }


        dest.writeInt(if (certificateChain != null) 1 else 0)
        if (certificateChain != null) {
            dest.writeList(certificateChain)
        }

        dest.writeInt(if (eacResult != null) 1 else 0)
        if (eacResult != null) {
            dest.writeSerializable(eacResult)
        }

        dest.writeInt(if (caResult != null) 1 else 0)
        if (caResult != null) {
            dest.writeSerializable(caResult)
        }
    }


    /**
     * The result of matching the stored and computed hashes of a single datagroup.
     *
     * FIXME: perhaps that boolean should be more like verdict, including a reason for mismatch if known (e.g. access denied for EAC datagroup) -- MO
     */
    class HashMatchResult
    /**
     * Use null for computed hash if access was denied.
     *
     * @param storedHash the hash stored in SOd
     * @param computedHash the computed hash
     */
    (storedHash: ByteArray, computedHash: ByteArray?) : Serializable {

        /**
         * Gets the stored hash.
         *
         * @return a hash
         */
        var storedHash: ByteArray? = null
            private set
        /**
         * Gets the computed hash.
         *
         * @return a hash
         */
        var computedHash: ByteArray? = null
            private set

        /**
         * Whether the hashes match.
         *
         * @return a boolean
         */
        val isMatch: Boolean
            get() = Arrays.equals(storedHash, computedHash)

        init {
            this.storedHash = storedHash
            this.computedHash = computedHash
        }

        override fun toString(): String {
            return "HashResult [" + isMatch + ", stored: " + Hex.bytesToHexString(storedHash) + ", computed: " + Hex.bytesToHexString(computedHash)
        }

        override fun hashCode(): Int {
            return 11 + 3 * Arrays.hashCode(storedHash) + 5 * Arrays.hashCode(computedHash)
        }

        override fun equals(other: Any?): Boolean {
            if (other == null) {
                return false
            }
            if (other === this) {
                return true
            }
            if (other.javaClass != this.javaClass) {
                return false
            }
            val otherHashResult = other as HashMatchResult?
            return Arrays.equals(otherHashResult!!.computedHash, computedHash) && Arrays.equals(otherHashResult.storedHash, storedHash)
        }

        /* NOTE: Part of our serializable implementation. */
        @Throws(IOException::class, ClassNotFoundException::class)
        private fun readObject(inputStream: ObjectInputStream) {
            //			inputStream.defaultReadObject();
            storedHash = readBytes(inputStream)
            computedHash = readBytes(inputStream)
        }

        /* NOTE: Part of our serializable implementation. */
        @Throws(IOException::class)
        private fun writeObject(outputStream: ObjectOutputStream) {
            //			outputStream.defaultWriteObject();
            writeByteArray(storedHash, outputStream)
            writeByteArray(computedHash, outputStream)
        }

        @Throws(IOException::class)
        private fun readBytes(inputStream: ObjectInputStream): ByteArray? {
            val length = inputStream.readInt()
            if (length < 0) {
                return null
            }
            val bytes = ByteArray(length)
            for (i in 0 until length) {
                val b = inputStream.readInt()
                bytes[i] = b.toByte()
            }
            return bytes
        }

        @Throws(IOException::class)
        private fun writeByteArray(bytes: ByteArray?, outputStream: ObjectOutputStream) {
            if (bytes == null) {
                outputStream.writeInt(-1)
            } else {
                outputStream.writeInt(bytes.size)
                for (b in bytes) {
                    outputStream.writeInt(b.toInt())
                }
            }
        }

        companion object {

            private const val serialVersionUID = 263961258911936111L
        }
    }

    companion object {
        @JvmField
        val CREATOR: Parcelable.Creator<*> = object : Parcelable.Creator<VerificationStatus> {
            override fun createFromParcel(pc: Parcel): VerificationStatus {
                return VerificationStatus(pc)
            }

            override fun newArray(size: Int): Array<VerificationStatus?> {
                return arrayOfNulls(size)
            }
        }
    }
}
