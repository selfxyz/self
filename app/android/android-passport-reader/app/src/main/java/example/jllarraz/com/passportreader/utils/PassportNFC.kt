package example.jllarraz.com.passportreader.utils

import android.util.Log

import net.sf.scuba.smartcards.CardServiceException

import org.bouncycastle.asn1.ASN1Encodable
import org.bouncycastle.asn1.ASN1Integer
import org.bouncycastle.asn1.DERSequence
import org.jmrtd.*

import java.io.IOException
import java.io.InputStream
import java.math.BigInteger
import java.security.GeneralSecurityException
import java.security.KeyStore
import java.security.MessageDigest
import java.security.NoSuchAlgorithmException
import java.security.PrivateKey
import java.security.PublicKey
import java.security.SecureRandom
import java.security.Security
import java.security.Signature
import java.security.cert.Certificate
import java.security.cert.CertificateException
import java.security.cert.X509Certificate
import java.security.interfaces.ECPublicKey
import java.security.interfaces.RSAPublicKey
import java.security.spec.MGF1ParameterSpec
import java.security.spec.PSSParameterSpec
import java.util.ArrayList
import java.util.Arrays
import java.util.Collections
import java.util.Random
import java.util.TreeMap
import java.util.TreeSet

import javax.crypto.Cipher
import javax.security.auth.x500.X500Principal

import org.jmrtd.cert.CardVerifiableCertificate
import org.jmrtd.lds.AbstractTaggedLDSFile
import org.jmrtd.lds.ActiveAuthenticationInfo
import org.jmrtd.lds.CVCAFile
import org.jmrtd.lds.CardAccessFile
import org.jmrtd.lds.ChipAuthenticationInfo
import org.jmrtd.lds.ChipAuthenticationPublicKeyInfo
import org.jmrtd.lds.LDSFileUtil
import org.jmrtd.lds.PACEInfo
import org.jmrtd.lds.SODFile
import org.jmrtd.lds.SecurityInfo
import org.jmrtd.lds.icao.COMFile
import org.jmrtd.lds.icao.DG11File
import org.jmrtd.lds.icao.DG12File
import org.jmrtd.lds.icao.DG14File
import org.jmrtd.lds.icao.DG15File
import org.jmrtd.lds.icao.DG1File
import org.jmrtd.lds.icao.DG2File
import org.jmrtd.lds.icao.DG3File
import org.jmrtd.lds.icao.DG5File
import org.jmrtd.lds.icao.DG7File
import org.jmrtd.lds.icao.MRZInfo
import org.jmrtd.protocol.BACResult
import org.jmrtd.protocol.EACCAResult
import org.jmrtd.protocol.EACTAResult
import org.jmrtd.protocol.PACEResult


class PassportNFC @Throws(GeneralSecurityException::class)
private constructor() {

    /** The hash function for DG hashes. */
    private var digest: MessageDigest? = null

    /**
     * Gets the supported features (such as: BAC, AA, EAC) as
     * discovered during initialization of this document.
     *
     * @return the supported features
     *
     * @since 0.4.9
     */
    /* The feature status has been created in constructor. */ val features: FeatureStatus
    /**
     * Gets the verification status thus far.
     *
     * @return the verification status
     *
     * @since 0.4.9
     */
    val verificationStatus: VerificationStatus

    /* We use a cipher to help implement Active Authentication RSA with ISO9796-2 message recovery. */
    @Transient
    private var rsaAASignature: Signature? = null
    @Transient
    private var rsaAADigest: MessageDigest? = null
    @Transient
    private val rsaAACipher: Cipher
    @Transient
    private var ecdsaAASignature: Signature? = null
    @Transient
    private var ecdsaAADigest: MessageDigest? = null

    /**
     * Gets the CSCA, CVCA trust store.
     *
     * @return the trust store in use
     */
    var trustManager: MRTDTrustStore?=null

    /**
     * Gets the document signing private key, or null if not present.
     *
     * @return a private key or null
     */
    /**
     * Sets the document signing private key.
     *
     * @param docSigningPrivateKey a private key
     */
    var docSigningPrivateKey: PrivateKey? = null
        set(docSigningPrivateKey) {
            field = docSigningPrivateKey
            updateCOMSODFile(null)
        }

    /**
     * Gets the CVCA certificate.
     *
     * @return a CV certificate or null
     */
    /**
     * Sets the CVCA certificate.
     *
     * @param cert the CV certificate
     */
    var cvCertificate: CardVerifiableCertificate? = null
        set(cert) {
            field = cert
            try {
                val cvcaFile = CVCAFile(PassportService.EF_CVCA, cvCertificate!!.holderReference.name)
                putFile(PassportService.EF_CVCA, cvcaFile.encoded)
            } catch (ce: CertificateException) {
                ce.printStackTrace()
            }

        }

    /**
     * Gets the private key for EAC, or null if not present.
     *
     * @return a private key or null
     */
    /**
     * Sets the private key for EAC.
     *
     * @param eacPrivateKey a private key
     */
    var eacPrivateKey: PrivateKey? = null

    /**
     * Gets the private key for AA, or null if not present.
     *
     * @return a private key or null
     */
    /**
     * Sets the private key for AA.
     *
     * @param aaPrivateKey a private key
     */
    var aaPrivateKey: PrivateKey? = null

    private var service: PassportService?=null

    private val random: Random


    var comFile: COMFile? = null
        private set
    var sodFile: SODFile? = null
        private set
    var dg1File: DG1File? = null
        private set
    var dg2File: DG2File? = null
        private set
    var dg3File: DG3File? = null
        private set
    var dg5File: DG5File? = null
        private set
    var dg7File: DG7File? = null
        private set
    var dg11File: DG11File? = null
        private set
    var dg12File: DG12File? = null
        private set
    var dg14File: DG14File? = null
        private set
    var dg15File: DG15File? = null
        private set
    var cvcaFile: CVCAFile? = null
        private set


    init {
        this.features = FeatureStatus()
        this.verificationStatus = VerificationStatus()

        this.random = SecureRandom()

        rsaAADigest = MessageDigest.getInstance("SHA1") /* NOTE: for output length measurement only. -- MO */
        rsaAASignature = Signature.getInstance("SHA1WithRSA/ISO9796-2", BC_PROVIDER)
        rsaAACipher = Cipher.getInstance("RSA/NONE/NoPadding")

        /* NOTE: These will be updated in doAA after caller has read ActiveAuthenticationSecurityInfo. */
        ecdsaAASignature = Signature.getInstance("SHA256withECDSA", BC_PROVIDER)
        ecdsaAADigest = MessageDigest.getInstance("SHA-256") /* NOTE: for output length measurement only. -- MO */
    }


    /**
     * Creates a document by reading it from a service.
     *
     * @param ps the service to read from
     * @param trustManager the trust manager (CSCA, CVCA)
     * @param mrzInfo the BAC entries
     *
     * @throws CardServiceException on error
     * @throws GeneralSecurityException if certain security primitives are not supported
     */
    @Throws(CardServiceException::class, GeneralSecurityException::class)
    constructor(ps: PassportService?, trustManager: MRTDTrustStore, mrzInfo: MRZInfo, maxBlockSize:Int) : this() {
        if (ps == null) {
            throw IllegalArgumentException("Service cannot be null")
        }
        this.service = ps
        this.trustManager = trustManager

        var hasSAC: Boolean = false
        var isSACSucceeded = false
        var paceResult: PACEResult? = null
        if(ps.isOpen == false){
            ps.open()
        }
        try {
            // (service as PassportService).open()

            /* Find out whether this MRTD supports SAC. */
            try {
                Log.i(TAG, "Inspecting card access file")
                val cardAccessFile = CardAccessFile((service as PassportService).getInputStream(PassportService.EF_CARD_ACCESS, maxBlockSize))
                val securityInfos = cardAccessFile.securityInfos
                for (securityInfo in securityInfos) {
                    if (securityInfo is PACEInfo) {
                        features.setSAC(FeatureStatus.Verdict.PRESENT)
                    }
                }
            } catch (e: Exception) {
                /* NOTE: No card access file, continue to test for BAC. */
                Log.i(TAG, "DEBUG: failed to get card access file: " + e.message)
                e.printStackTrace()
            }

            hasSAC = features.hasSAC() == FeatureStatus.Verdict.PRESENT

            if (hasSAC) {
                try {
                    paceResult = doPACE(ps, mrzInfo, maxBlockSize)
                    if(paceResult!=null) {
                        isSACSucceeded = true
                    }else{
                        isSACSucceeded = false
                    }
                } catch (e: Exception) {
                    e.printStackTrace()
                    Log.i(TAG, "PACE failed, falling back to BAC")
                    isSACSucceeded = false
                }
            }
            (service as PassportService).sendSelectApplet(isSACSucceeded)
        } catch (cse: CardServiceException) {
            throw cse
        } catch (e: Exception) {
            e.printStackTrace()
            throw CardServiceException("Cannot open document. " + e.message)
        }


        /* Find out whether this MRTD supports BAC. */
        try {
            /* Attempt to read EF.COM before BAC. */
            COMFile(
                (service as PassportService).getInputStream(
                    PassportService.EF_COM,
                    maxBlockSize
                ))


            if (isSACSucceeded) {
                verificationStatus.setSAC(VerificationStatus.Verdict.SUCCEEDED, "Succeeded")
                features.setBAC(FeatureStatus.Verdict.UNKNOWN)
                verificationStatus.setBAC(VerificationStatus.Verdict.NOT_CHECKED, "Using SAC, BAC not checked", EMPTY_TRIED_BAC_ENTRY_LIST)
            } else {
                /* We failed SAC, and we failed BAC. */
                features.setBAC(FeatureStatus.Verdict.NOT_PRESENT)
                verificationStatus.setBAC(VerificationStatus.Verdict.NOT_PRESENT, "Non-BAC document", EMPTY_TRIED_BAC_ENTRY_LIST)
            }
        } catch (e: Exception) {
            Log.i(TAG, "Attempt to read EF.COM before BAC failed with: " + e.message)
            features.setBAC(FeatureStatus.Verdict.PRESENT)
            verificationStatus.setBAC(VerificationStatus.Verdict.NOT_CHECKED, "BAC document", EMPTY_TRIED_BAC_ENTRY_LIST)
        }

        /* If we have to do BAC, try to do BAC. */
        val hasBAC = features.hasBAC() == FeatureStatus.Verdict.PRESENT

        if (hasBAC && !(hasSAC && isSACSucceeded)) {
            val bacKey = BACKey(mrzInfo.documentNumber, mrzInfo.dateOfBirth, mrzInfo.dateOfExpiry)
            val triedBACEntries = ArrayList<BACKey>()
            triedBACEntries.add(bacKey)
            try {
                doBAC(service as PassportService, mrzInfo)
                verificationStatus.setBAC(VerificationStatus.Verdict.SUCCEEDED, "BAC succeeded with key $bacKey", triedBACEntries)
            } catch (e: Exception) {
                verificationStatus.setBAC(VerificationStatus.Verdict.FAILED, "BAC failed", triedBACEntries)
            }

        }


        /* Pre-read these files that are always present. */

        val dgNumbersAlreadyRead = TreeSet<Int>()

        try {
            comFile = getComFile(ps, maxBlockSize)
            sodFile = getSodFile(ps, maxBlockSize)
            dg1File = getDG1File(ps, maxBlockSize)
            dgNumbersAlreadyRead.add(1)
        } catch (ioe: IOException) {
            ioe.printStackTrace()
            Log.w(TAG, "Could not read file")
        }

        try {
            dg14File = getDG14File(ps, maxBlockSize)
        } catch (e: Exception) {
            e.printStackTrace()
        }

        try {
            cvcaFile = getCVCAFile(ps, maxBlockSize)
        } catch (e: Exception) {
            e.printStackTrace()
        }

        /* Get the list of DGs from EF.SOd, we don't trust EF.COM. */
        val dgNumbers = ArrayList<Int>()
        if (sodFile != null) {
            dgNumbers.addAll(sodFile!!.dataGroupHashes.keys)
        } else if (comFile != null) {
            /* Get the list from EF.COM since we failed to parse EF.SOd. */
            Log.w(TAG, "Failed to get DG list from EF.SOd. Getting DG list from EF.COM.")
            val tagList = comFile!!.tagList
            dgNumbers.addAll(toDataGroupList(tagList)!!)
        }
        Collections.sort(dgNumbers) /* NOTE: need to sort it, since we get keys as a set. */

        Log.i(TAG, "Found DGs: $dgNumbers")

        var hashResults: MutableMap<Int, VerificationStatus.HashMatchResult>? = verificationStatus.hashResults
        if (hashResults == null) {
            hashResults = TreeMap<Int, VerificationStatus.HashMatchResult>()
        }

        if (sodFile != null) {
            /* Initial hash results: we know the stored hashes, but not the computed hashes yet. */
            val storedHashes = sodFile!!.dataGroupHashes
            for (dgNumber in dgNumbers) {
                val storedHash = storedHashes[dgNumber]
                var hashResult: VerificationStatus.HashMatchResult? = hashResults[dgNumber]
                if (hashResult != null) {
                    continue
                }
                if (dgNumbersAlreadyRead.contains(dgNumber)) {
                    hashResult = verifyHash(dgNumber)
                } else {
                    hashResult = VerificationStatus.HashMatchResult(storedHash!!, null)
                }
                hashResults[dgNumber] = hashResult!!
            }
        }
        verificationStatus.setHT(VerificationStatus.Verdict.UNKNOWN, verificationStatus.htReason, hashResults)

        /* Check EAC support by DG14 presence. */
        if (dgNumbers.contains(14)) {
            features.setEAC(FeatureStatus.Verdict.PRESENT)
            if(isChipAuthenticationInfoAvailable(ps, mrzInfo, dg14File, sodFile)) {
                features.setCA(FeatureStatus.Verdict.PRESENT)
            }else{
                features.setCA(FeatureStatus.Verdict.NOT_PRESENT)
            }
        } else {
            features.setEAC(FeatureStatus.Verdict.NOT_PRESENT)
            features.setCA(FeatureStatus.Verdict.NOT_PRESENT)
        }

        val hasCA = features.hasCA() == FeatureStatus.Verdict.PRESENT
        if (hasCA) {
            try {
                val eaccaResults = doEACCA(ps, mrzInfo, dg14File, sodFile)
                verificationStatus.setCA(VerificationStatus.Verdict.SUCCEEDED, "EAC succeeded", eaccaResults[0])
            } catch (e: Exception) {
                verificationStatus.setCA(VerificationStatus.Verdict.FAILED, "CA Failed", null)
            }

        }

        val hasEAC = features.hasEAC() == FeatureStatus.Verdict.PRESENT
        val cvcaKeyStores = trustManager.cvcaStores
        if (hasEAC && cvcaKeyStores != null && cvcaKeyStores.size > 0 && verificationStatus.ca == VerificationStatus.Verdict.SUCCEEDED) {
            try {
                val eactaResults = doEACTA(ps, mrzInfo, cvcaFile, paceResult, verificationStatus.caResult, cvcaKeyStores)
                verificationStatus.setEAC(VerificationStatus.Verdict.SUCCEEDED, "EAC succeeded", eactaResults[0])
            } catch (e: Exception) {
                e.printStackTrace()
                verificationStatus.setEAC(VerificationStatus.Verdict.FAILED, "EAC Failed", null)
            }

            dgNumbersAlreadyRead.add(14)
        }

        /* Check AA support by DG15 presence. */
        if (dgNumbers.contains(15)) {
            features.setAA(FeatureStatus.Verdict.PRESENT)
        } else {
            features.setAA(FeatureStatus.Verdict.NOT_PRESENT)
        }
        val hasAA = features.hasAA() == FeatureStatus.Verdict.PRESENT
        if (hasAA) {
            try {
                dg15File = getDG15File(ps, maxBlockSize)
                dgNumbersAlreadyRead.add(15)
            } catch (ioe: IOException) {
                ioe.printStackTrace()
                Log.w(TAG, "Could not read file")
            } catch (e: Exception) {
                verificationStatus.setAA(VerificationStatus.Verdict.NOT_CHECKED, "Failed to read DG15")
            }

        } else {
            /* Feature status says: no AA, so verification status should say: no AA. */
            verificationStatus.setAA(VerificationStatus.Verdict.NOT_PRESENT, "AA is not supported")
        }


        try {
            dg2File = getDG2File(ps, maxBlockSize)
        } catch (e: Exception) {
            e.printStackTrace()
        }

        try {
            dg3File = getDG3File(ps, maxBlockSize)
        } catch (e: Exception) {
            e.printStackTrace()
        }

        try {
            dg5File = getDG5File(ps, maxBlockSize)
        } catch (e: Exception) {
            e.printStackTrace()
        }

        try {
            dg7File = getDG7File(ps, maxBlockSize)
        } catch (e: Exception) {
            e.printStackTrace()
        }


        try {
            dg11File = getDG11File(ps, maxBlockSize)
        } catch (e: Exception) {
            e.printStackTrace()
        }

        try {
            dg12File = getDG12File(ps, maxBlockSize)
        } catch (e: Exception) {
            e.printStackTrace()
        }

    }

    /**
     * Sets the document signing certificate.
     *
     * @param docSigningCertificate a certificate
     */
    fun setDocSigningCertificate(docSigningCertificate: X509Certificate) {
        updateCOMSODFile(docSigningCertificate)
    }

    /**
     * Sets the public key for EAC.
     *
     * @param eacPublicKey a public key
     */
    fun setEACPublicKey(eacPublicKey: PublicKey) {
        val chipAuthenticationPublicKeyInfo = ChipAuthenticationPublicKeyInfo(eacPublicKey)
        val dg14File = DG14File(Arrays.asList(*arrayOf<SecurityInfo>(chipAuthenticationPublicKeyInfo)))
        putFile(PassportService.EF_DG14, dg14File.encoded)
    }

    /**
     * Sets the public key for AA.
     *
     * @param aaPublicKey a public key
     */
    fun setAAPublicKey(aaPublicKey: PublicKey) {
        val dg15file = DG15File(aaPublicKey)
        putFile(PassportService.EF_DG15, dg15file.encoded)
    }

    /**
     * Verifies the document using the security related mechanisms.
     * Convenience method.
     *
     * @return the security status
     */
    fun verifySecurity(): VerificationStatus {
        /* NOTE: Since 0.4.9 verifyAA and verifyEAC were removed. AA is always checked as part of the prelude.
        * (EDIT: For debugging it's back here again, see below...)
        */
        /* NOTE: We could also move verifyDS and verifyCS to prelude. */
        /* NOTE: COM SOd consistency check ("Jeroen van Beek sanity check") is implicit now, we work from SOd, ignoring COM. */

        /* Verify whether the Document Signing Certificate is signed by a Trust Anchor in our CSCA store. */
        verifyCS()

        /* Verify whether hashes in EF.SOd signed with document signer certificate. */
        verifyDS()

        /* Verify hashes. */
        verifyHT()

        /* DEBUG: apparently it matters where we do AA, in prelude or in the end?!?! -- MO */
        if (service != null && dg15File != null) {
            verifyAA()
        }

        return verificationStatus
    }

    /**
     * Inserts a file into this document, and updates EF_COM and EF_SOd accordingly.
     *
     * @param fid the FID of the new file
     * @param bytes the contents of the new file
     */
    private fun putFile(fid: Short, bytes: ByteArray?) {
        if (bytes == null) {
            return
        }
        try {
            //lds.add(fid, new ByteArrayInputStream(bytes), bytes.length);
            // FIXME: is this necessary?
            if (fid != PassportService.EF_COM && fid != PassportService.EF_SOD && fid != PassportService.EF_CVCA) {
                updateCOMSODFile(null)
            }
        } catch (ioe: Exception) {
            ioe.printStackTrace()
        }

        verificationStatus.setAll(VerificationStatus.Verdict.UNKNOWN, "Unknown") // FIXME: why all?
    }

    /**
     * Updates EF_COM and EF_SOd using a new document signing certificate.
     *
     * @param newCertificate a certificate
     */
    private fun updateCOMSODFile(newCertificate: X509Certificate?) {
        try {
            val digestAlg = sodFile!!.digestAlgorithm
            val signatureAlg = sodFile!!.digestEncryptionAlgorithm
            val cert = newCertificate ?: sodFile!!.docSigningCertificate
            val signature = sodFile!!.encryptedDigest
            val dgHashes = TreeMap<Int, ByteArray>()

            val dgFids = LDSFileUtil.getDataGroupNumbers(sodFile)
            val digest: MessageDigest
            digest = MessageDigest.getInstance(digestAlg)
            for (fid in dgFids) {
                if (fid != PassportService.EF_COM.toInt() && fid != PassportService.EF_SOD.toInt() && fid != PassportService.EF_CVCA.toInt()) {
                    val dg = getDG(fid)
                    if (dg == null) {
                        Log.w(TAG, "Could not get input stream for " + Integer.toHexString(fid))
                        continue
                    }
                    val tag = dg.encoded[0]
                    dgHashes[LDSFileUtil.lookupDataGroupNumberByTag(tag.toInt())] = digest.digest(dg.encoded)
                    comFile!!.insertTag(tag.toInt() and 0xFF)
                }
            }
            if (this.docSigningPrivateKey != null) {
                sodFile = SODFile(digestAlg, signatureAlg, dgHashes, this.docSigningPrivateKey, cert)
            } else {
                sodFile = SODFile(digestAlg, signatureAlg, dgHashes, signature, cert)
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }

    }

    ///////////////////////////////////

    /** Check active authentication. */
    private fun verifyAA() {
        if (dg15File == null || service == null) {
            verificationStatus.setAA(VerificationStatus.Verdict.FAILED, "AA failed")
            return
        }

        try {

            val pubKey = dg15File!!.publicKey
            val pubKeyAlgorithm = pubKey.algorithm
            var digestAlgorithm = "SHA1"
            var signatureAlgorithm = "SHA1WithRSA/ISO9796-2"
            if ("EC" == pubKeyAlgorithm || "ECDSA" == pubKeyAlgorithm) {

                // List activeAuthenticationInfos = dg14File.getActiveAuthenticationInfos();
                val activeAuthenticationInfoList = ArrayList<ActiveAuthenticationInfo>()
                val securityInfos = dg14File!!.securityInfos
                for (securityInfo in securityInfos) {
                    if (securityInfo is ActiveAuthenticationInfo) {
                        activeAuthenticationInfoList.add(securityInfo)
                    }
                }


                val activeAuthenticationInfoCount = activeAuthenticationInfoList.size
                if (activeAuthenticationInfoCount < 1) {
                    verificationStatus.setAA(VerificationStatus.Verdict.FAILED, "Found no active authentication info in EF.DG14")
                    return
                } else if (activeAuthenticationInfoCount > 1) {
                    Log.w(TAG, "Found $activeAuthenticationInfoCount in EF.DG14, expected 1.")
                }
                val activeAuthenticationInfo = activeAuthenticationInfoList[0]

                val signatureAlgorithmOID = activeAuthenticationInfo.signatureAlgorithmOID

                signatureAlgorithm = ActiveAuthenticationInfo.lookupMnemonicByOID(signatureAlgorithmOID)

                digestAlgorithm = Util.inferDigestAlgorithmFromSignatureAlgorithm(signatureAlgorithm)
            }
            val challengeLength = 8
            val challenge = ByteArray(challengeLength)
            random.nextBytes(challenge)
            val aaResult = (service as PassportService).doAA(dg15File!!.publicKey, sodFile!!.digestAlgorithm, sodFile!!.signerInfoDigestAlgorithm, challenge)
            if (verifyAA(pubKey, digestAlgorithm, signatureAlgorithm, challenge, aaResult.response)) {
                verificationStatus.setAA(VerificationStatus.Verdict.SUCCEEDED, "AA succeeded")
            } else {
                verificationStatus.setAA(VerificationStatus.Verdict.FAILED, "AA failed due to signature failure")
            }
        } catch (cse: CardServiceException) {
            cse.printStackTrace()
            verificationStatus.setAA(VerificationStatus.Verdict.FAILED, "AA failed due to exception")
        } catch (e: Exception) {
            Log.e(TAG, "DEBUG: this exception wasn't caught in verification logic (< 0.4.8) -- MO 3. Type is " + e.javaClass.canonicalName!!)
            e.printStackTrace()
            verificationStatus.setAA(VerificationStatus.Verdict.FAILED, "AA failed due to exception")
        }

    }

    @Throws(CardServiceException::class)
    private fun verifyAA(publicKey: PublicKey, digestAlgorithm: String?, signatureAlgorithm: String?, challenge: ByteArray, response: ByteArray): Boolean {
        try {
            val pubKeyAlgorithm = publicKey.algorithm
            if ("RSA" == pubKeyAlgorithm) {
                /* FIXME: check that digestAlgorithm = "SHA1" in this case, check (and re-initialize) rsaAASignature (and rsaAACipher). */
                Log.w(TAG, "Unexpected algorithms for RSA AA: "
                        + "digest algorithm = " + (digestAlgorithm ?: "null")
                        + ", signature algorithm = " + (signatureAlgorithm ?: "null"))

                rsaAADigest = MessageDigest.getInstance(digestAlgorithm) /* NOTE: for output length measurement only. -- MO */
                rsaAASignature = Signature.getInstance(signatureAlgorithm, BC_PROVIDER)

                val rsaPublicKey = publicKey as RSAPublicKey
                rsaAACipher.init(Cipher.DECRYPT_MODE, rsaPublicKey)
                rsaAASignature!!.initVerify(rsaPublicKey)

                val digestLength = rsaAADigest!!.digestLength /* SHA1 should be 20 bytes = 160 bits */
                if (digestLength != 20) throw AssertionError()
                val plaintext = rsaAACipher.doFinal(response)
                val m1 = Util.recoverMessage(digestLength, plaintext)
                rsaAASignature!!.update(m1)
                rsaAASignature!!.update(challenge)
                return rsaAASignature!!.verify(response)
            } else if ("EC" == pubKeyAlgorithm || "ECDSA" == pubKeyAlgorithm) {
                val ecdsaPublicKey = publicKey as ECPublicKey

                if (ecdsaAASignature == null || signatureAlgorithm != null && signatureAlgorithm != ecdsaAASignature!!.algorithm) {
                    Log.w(TAG, "Re-initializing ecdsaAASignature with signature algorithm " + signatureAlgorithm!!)
                    ecdsaAASignature = Signature.getInstance(signatureAlgorithm)
                }
                if (ecdsaAADigest == null || digestAlgorithm != null && digestAlgorithm != ecdsaAADigest!!.algorithm) {
                    Log.w(TAG, "Re-initializing ecdsaAADigest with digest algorithm " + digestAlgorithm!!)
                    ecdsaAADigest = MessageDigest.getInstance(digestAlgorithm)
                }

                ecdsaAASignature!!.initVerify(ecdsaPublicKey)

                if (response.size % 2 != 0) {
                    Log.w(TAG, "Active Authentication response is not of even length")
                }

                val l = response.size / 2
                val r = Util.os2i(response, 0, l)
                val s = Util.os2i(response, l, l)

                ecdsaAASignature!!.update(challenge)

                try {

                    val asn1Sequence = DERSequence(arrayOf<ASN1Encodable>(ASN1Integer(r), ASN1Integer(s)))
                    return ecdsaAASignature!!.verify(asn1Sequence.encoded)
                } catch (ioe: IOException) {
                    Log.e(TAG, "Unexpected exception during AA signature verification with ECDSA")
                    ioe.printStackTrace()
                    return false
                }

            } else {
                Log.e(TAG, "Unsupported AA public key type " + publicKey.javaClass.simpleName)
                return false
            }
        } catch (iae: IllegalArgumentException) {
            // iae.printStackTrace();
            throw CardServiceException(iae.toString())
        } catch (iae: GeneralSecurityException) {
            throw CardServiceException(iae.toString())
        }

    }

    /**
     * Checks the security object's signature.
     *
     * TODO: Check the cert stores (notably PKD) to fetch document signer certificate (if not embedded in SOd) and check its validity before checking the signature.
     */
    private fun verifyDS() {
        try {
            verificationStatus.setDS(VerificationStatus.Verdict.UNKNOWN, "Unknown")

            /* Check document signing signature. */
            val docSigningCert = sodFile!!.docSigningCertificate
            if (docSigningCert == null) {
                Log.w(TAG, "Could not get document signer certificate from EF.SOd")
                // FIXME: We search for it in cert stores. See note at verifyCS.
                // X500Principal issuer = sod.getIssuerX500Principal();
                // BigInteger serialNumber = sod.getSerialNumber();
            }
            if (checkDocSignature(docSigningCert)) {
                verificationStatus.setDS(VerificationStatus.Verdict.SUCCEEDED, "Signature checked")
            } else {
                verificationStatus.setDS(VerificationStatus.Verdict.FAILED, "Signature incorrect")
            }
        } catch (nsae: NoSuchAlgorithmException) {
            verificationStatus.setDS(VerificationStatus.Verdict.FAILED, "Unsupported signature algorithm")
            return /* NOTE: Serious enough to not perform other checks, leave method. */
        } catch (e: Exception) {
            e.printStackTrace()
            verificationStatus.setDS(VerificationStatus.Verdict.FAILED, "Unexpected exception")
            return /* NOTE: Serious enough to not perform other checks, leave method. */
        }

    }

    /**
     * Checks the certificate chain.
     */
    private fun verifyCS() {
        try {

            val chain = ArrayList<Certificate>()

            if (sodFile == null) {
                verificationStatus.setCS(VerificationStatus.Verdict.FAILED, "Unable to build certificate chain", chain)
                return
            }

            /* Get doc signing certificate and issuer info. */
            var docSigningCertificate: X509Certificate? = null
            var sodIssuer: X500Principal? = null
            var sodSerialNumber: BigInteger? = null
            try {
                sodIssuer = sodFile!!.issuerX500Principal
                sodSerialNumber = sodFile!!.serialNumber
                docSigningCertificate = sodFile!!.docSigningCertificate
            } catch (e: Exception) {
                Log.w(TAG, "Error getting document signing certificate: " + e.message)
                // FIXME: search for it in cert stores?
            }

            if (docSigningCertificate != null) {
                chain.add(docSigningCertificate)
            } else {
                Log.w(TAG, "Error getting document signing certificate from EF.SOd")
            }

            /* Get trust anchors. */
            val cscaStores = trustManager?.cscaStores
            if (cscaStores == null || cscaStores.size <= 0) {
                Log.w(TAG, "No CSCA certificate stores found.")
                verificationStatus.setCS(VerificationStatus.Verdict.FAILED, "No CSCA certificate stores found", chain)
            }
            val cscaTrustAnchors = trustManager?.cscaAnchors
            if (cscaTrustAnchors == null || cscaTrustAnchors.size <= 0) {
                Log.w(TAG, "No CSCA trust anchors found.")
                verificationStatus.setCS(VerificationStatus.Verdict.FAILED, "No CSCA trust anchors found", chain)
            }

            /* Optional internal EF.SOd consistency check. */
            if (docSigningCertificate != null) {
                val docIssuer = docSigningCertificate.issuerX500Principal
                if (sodIssuer != null && sodIssuer != docIssuer) {
                    Log.e(TAG, "Security object issuer principal is different from embedded DS certificate issuer!")
                }
                val docSerialNumber = docSigningCertificate.serialNumber
                if (sodSerialNumber != null && sodSerialNumber != docSerialNumber) {
                    Log.w(TAG, "Security object serial number is different from embedded DS certificate serial number!")
                }
            }

            /* Run PKIX algorithm to build chain to any trust anchor. Add certificates to our chain. */
            val pkixChain = PassportNfcUtils.getCertificateChain(docSigningCertificate, sodIssuer!!, sodSerialNumber!!, cscaStores!!, cscaTrustAnchors!!)
            if (pkixChain == null) {
                verificationStatus.setCS(VerificationStatus.Verdict.FAILED, "Could not build chain to trust anchor (pkixChain == null)", chain)
                return
            }

            for (certificate in pkixChain) {
                if (certificate == docSigningCertificate) {
                    continue
                } /* Ignore DS certificate, which is already in chain. */
                chain.add(certificate)
            }

            val chainDepth = chain.size
            if (chainDepth <= 1) {
                verificationStatus.setCS(VerificationStatus.Verdict.FAILED, "Could not build chain to trust anchor", chain)
                return
            }
            if (chainDepth > 1 && verificationStatus.cs == VerificationStatus.Verdict.UNKNOWN) {
                verificationStatus.setCS(VerificationStatus.Verdict.SUCCEEDED, "Found a chain to a trust anchor", chain)
            }

        } catch (e: Exception) {
            e.printStackTrace()
            verificationStatus.setCS(VerificationStatus.Verdict.FAILED, "Signature failed", EMPTY_CERTIFICATE_CHAIN)
        }

    }

    /**
     * Checks hashes in the SOd correspond to hashes we compute.
     */
    private fun verifyHT() {
        /* Compare stored hashes to computed hashes. */
        var hashResults: MutableMap<Int, VerificationStatus.HashMatchResult>? = verificationStatus.hashResults
        if (hashResults == null) {
            hashResults = TreeMap<Int, VerificationStatus.HashMatchResult>()
        }

        if (sodFile == null) {
            verificationStatus.setHT(VerificationStatus.Verdict.FAILED, "No SOd", hashResults)
            return
        }

        val storedHashes = sodFile!!.dataGroupHashes
        for (dgNumber in storedHashes.keys) {
            verifyHash(dgNumber, hashResults)
        }
        if (verificationStatus.ht == VerificationStatus.Verdict.UNKNOWN) {
            verificationStatus.setHT(VerificationStatus.Verdict.SUCCEEDED, "All hashes match", hashResults)
        } else {
            /* Update storedHashes and computedHashes. */
            verificationStatus.setHT(verificationStatus.ht!!, verificationStatus.htReason, hashResults)
        }
    }

    private fun verifyHash(dgNumber: Int): VerificationStatus.HashMatchResult? {
        var hashResults: MutableMap<Int, VerificationStatus.HashMatchResult>? = verificationStatus.hashResults
        if (hashResults == null) {
            hashResults = TreeMap<Int, VerificationStatus.HashMatchResult>()
        }
        return verifyHash(dgNumber, hashResults)
    }

    /**
     * Verifies the hash for the given datagroup.
     * Note that this will block until all bytes of the datagroup
     * are loaded.
     *
     * @param dgNumber
     *
     * @param hashResults the hashtable status to update
     */
    private fun verifyHash(dgNumber: Int, hashResults: MutableMap<Int, VerificationStatus.HashMatchResult>): VerificationStatus.HashMatchResult? {
        val fid = LDSFileUtil.lookupFIDByTag(LDSFileUtil.lookupTagByDataGroupNumber(dgNumber))


        /* Get the stored hash for the DG. */
        var storedHash: ByteArray? = null
        try {
            val storedHashes = sodFile!!.dataGroupHashes
            storedHash = storedHashes[dgNumber]
        } catch (e: Exception) {
            verificationStatus.setHT(VerificationStatus.Verdict.FAILED, "DG$dgNumber failed, could not get stored hash", hashResults)
            return null
        }

        /* Initialize hash. */
        val digestAlgorithm = sodFile!!.digestAlgorithm
        try {
            digest = getDigest(digestAlgorithm)
        } catch (nsae: NoSuchAlgorithmException) {
            verificationStatus.setHT(VerificationStatus.Verdict.FAILED, "Unsupported algorithm \"$digestAlgorithm\"", null)
            return null // DEBUG -- MO
        }

        /* Read the DG. */
        var dgBytes: ByteArray? = null
        try {
            /*InputStream dgIn = null;
            int length = lds.getLength(fid);
            if (length > 0) {
            dgBytes = new byte[length];
            dgIn = lds.getInputStream(fid);
            DataInputStream dgDataIn = new DataInputStream(dgIn);
            dgDataIn.readFully(dgBytes);
            }*/

            val abstractTaggedLDSFile = getDG(fid.toInt())
            if (abstractTaggedLDSFile != null) {
                dgBytes = abstractTaggedLDSFile.encoded
            }

            if (abstractTaggedLDSFile == null && verificationStatus.eac != VerificationStatus.Verdict.SUCCEEDED && (fid == PassportService.EF_DG3 || fid == PassportService.EF_DG4)) {
                Log.w(TAG, "Skipping DG$dgNumber during HT verification because EAC failed.")
                val hashResult = VerificationStatus.HashMatchResult(storedHash!!, null)
                hashResults[dgNumber] = hashResult
                return hashResult
            }
            if (abstractTaggedLDSFile == null) {
                Log.w(TAG, "Skipping DG$dgNumber during HT verification because file could not be read.")
                val hashResult = VerificationStatus.HashMatchResult(storedHash!!, null)
                hashResults[dgNumber] = hashResult
                return hashResult
            }

        } catch (e: Exception) {
            val hashResult = VerificationStatus.HashMatchResult(storedHash!!, null)
            hashResults[dgNumber] = hashResult
            verificationStatus.setHT(VerificationStatus.Verdict.FAILED, "DG$dgNumber failed due to exception", hashResults)
            return hashResult
        }

        /* Compute the hash and compare. */
        try {
            val computedHash = digest!!.digest(dgBytes)
            val hashResult = VerificationStatus.HashMatchResult(storedHash!!, computedHash)
            hashResults[dgNumber] = hashResult

            if (!Arrays.equals(storedHash, computedHash)) {
                verificationStatus.setHT(VerificationStatus.Verdict.FAILED, "Hash mismatch", hashResults)
            }

            return hashResult
        } catch (ioe: Exception) {
            val hashResult = VerificationStatus.HashMatchResult(storedHash!!, null)
            hashResults[dgNumber] = hashResult
            verificationStatus.setHT(VerificationStatus.Verdict.FAILED, "Hash failed due to exception", hashResults)
            return hashResult
        }

    }


    @Throws(NoSuchAlgorithmException::class)
    private fun getDigest(digestAlgorithm: String): MessageDigest? {
        if (digest != null) {
            digest!!.reset()
            return digest
        }
        Log.i(TAG, "Using hash algorithm $digestAlgorithm")
        if (Security.getAlgorithms("MessageDigest").contains(digestAlgorithm)) {
            digest = MessageDigest.getInstance(digestAlgorithm)
        } else {
            digest = MessageDigest.getInstance(digestAlgorithm, BC_PROVIDER)
        }
        return digest
    }

    private fun getDG(dg: Int): AbstractTaggedLDSFile? {
        when (dg) {
            1 -> {
                return dg1File
            }
            2 -> {
                return dg2File
            }
            3 -> {
                return dg3File
            }
            5 -> {
                return dg5File
            }
            7 -> {
                return dg7File
            }
            11 -> {
                return dg11File
            }
            12 -> {
                return dg12File
            }
            14 -> {
                return dg14File
            }
            15 -> {
                return dg15File
            }
            else -> {
                return null
            }
        }

    }


    /**
     * Verifies the signature over the contents of the security object.
     * Clients can also use the accessors of this class and check the
     * validity of the signature for themselves.
     *
     * See RFC 3369, Cryptographic Message Syntax, August 2002,
     * Section 5.4 for details.
     *
     * @param docSigningCert the certificate to use
     * (should be X509 certificate)
     *
     * @return status of the verification
     *
     * @throws GeneralSecurityException if something goes wrong
     */
    /* FIXME: move this out of lds package. */
    @Throws(GeneralSecurityException::class)
    private fun checkDocSignature(docSigningCert: Certificate?): Boolean {
        val eContent = sodFile!!.eContent
        val signature = sodFile!!.encryptedDigest

        var digestEncryptionAlgorithm: String? = null
        try {
            digestEncryptionAlgorithm = sodFile!!.digestEncryptionAlgorithm
        } catch (e: Exception) {
            digestEncryptionAlgorithm = null
        }

        /*
        * For the cases where the signature is simply a digest (haven't seen a passport like this,
        * thus this is guessing)
        */
        if (digestEncryptionAlgorithm == null) {
            val digestAlg = sodFile!!.signerInfoDigestAlgorithm
            var digest: MessageDigest? = null
            try {
                digest = MessageDigest.getInstance(digestAlg)
            } catch (e: Exception) {
                digest = MessageDigest.getInstance(digestAlg, BC_PROVIDER)
            }

            digest!!.update(eContent)
            val digestBytes = digest.digest()
            return Arrays.equals(digestBytes, signature)
        }


        /* For RSA_SA_PSS
        * 1. the default hash is SHA1,
        * 2. The hash id is not encoded in OID
        * So it has to be specified "manually".
        */
        if ("SSAwithRSA/PSS" == digestEncryptionAlgorithm) {
            val digestAlg = sodFile!!.signerInfoDigestAlgorithm
            digestEncryptionAlgorithm = digestAlg.replace("-", "") + "withRSA/PSS"
        }

        if ("RSA" == digestEncryptionAlgorithm) {
            val digestJavaString = sodFile!!.signerInfoDigestAlgorithm
            digestEncryptionAlgorithm = digestJavaString.replace("-", "") + "withRSA"
        }

        Log.i(TAG, "digestEncryptionAlgorithm = $digestEncryptionAlgorithm")

        var sig: Signature? = null

        sig = Signature.getInstance(digestEncryptionAlgorithm, BC_PROVIDER)
        if (digestEncryptionAlgorithm.endsWith("withRSA/PSS")) {
            val saltLength = findSaltRSA_PSS(digestEncryptionAlgorithm, docSigningCert, eContent, signature)//Unknown salt so we try multiples until we get a success or failure
            val mgf1ParameterSpec = MGF1ParameterSpec("SHA-256")
            val pssParameterSpec = PSSParameterSpec("SHA-256", "MGF1", mgf1ParameterSpec, saltLength, 1)
            sig!!.setParameter(pssParameterSpec)
        }
        /*try {
        sig = Signature.getInstance(digestEncryptionAlgorithm);
        } catch (Exception e) {
        sig = Signature.getInstance(digestEncryptionAlgorithm, BC_PROVIDER);
        }*/
        sig!!.initVerify(docSigningCert)
        sig.update(eContent)
        return sig.verify(signature)
    }


    private fun findSaltRSA_PSS(digestEncryptionAlgorithm: String, docSigningCert: Certificate?, eContent: ByteArray, signature: ByteArray): Int {
        //Using brute force
        for (i in 0..512) {
            try {
                var sig: Signature? = null

                sig = Signature.getInstance(digestEncryptionAlgorithm, BC_PROVIDER)
                if (digestEncryptionAlgorithm.endsWith("withRSA/PSS")) {
                    val mgf1ParameterSpec = MGF1ParameterSpec("SHA-256")
                    val pssParameterSpec = PSSParameterSpec("SHA-256", "MGF1", mgf1ParameterSpec, i, 1)
                    sig!!.setParameter(pssParameterSpec)
                }

                sig!!.initVerify(docSigningCert)
                sig.update(eContent)
                val verify = sig.verify(signature)
                if (verify) {
                    return i
                }
            } catch (e: Exception) {
                e.printStackTrace()
            }

        }
        return 0//Unable to find it
    }


    ////////////////////////////

    @Throws(IOException::class, CardServiceException::class, GeneralSecurityException::class)
    private fun doPACE(ps: PassportService, mrzInfo: MRZInfo, maxBlockSize: Int): PACEResult? {
        var paceResult: PACEResult? = null
        var isCardAccessFile: InputStream? = null
        try {
            val bacKey = BACKey(mrzInfo.documentNumber, mrzInfo.dateOfBirth, mrzInfo.dateOfExpiry)
            val paceKeySpec = PACEKeySpec.createMRZKey(bacKey)
            isCardAccessFile = ps.getInputStream(PassportService.EF_CARD_ACCESS, maxBlockSize)

            val cardAccessFile = CardAccessFile(isCardAccessFile)
            val paceInfos = ArrayList<PACEInfo>()
            for(securityInfo in cardAccessFile.securityInfos){
                if (securityInfo is PACEInfo) {
                    paceInfos.add(securityInfo)
                }
            }

            if (paceInfos.isNotEmpty()) {
                for(paceInfo in paceInfos){
                    try {
                        paceResult = ps.doPACE(
                            paceKeySpec,
                            paceInfo.objectIdentifier,
                            PACEInfo.toParameterSpec(paceInfo.parameterId),
                            paceInfo.parameterId
                        )
                        break
                    }catch (e: java.lang.Exception){
                        e.printStackTrace()
                    }
                }
                // val paceInfo = paceInfos.iterator().next()
                //paceResult = ps.doPACE(paceKeySpec, paceInfo.objectIdentifier, PACEInfo.toParameterSpec(paceInfo.parameterId), paceInfo.parameterId)
                //paceResult = ps.doPACE(paceKeySpec, paceInfo.objectIdentifier, PACEInfo.toParameterSpec(paceInfo.parameterId))
            }
        } finally {
            if (isCardAccessFile != null) {
                isCardAccessFile.close()
                isCardAccessFile = null
            }
        }
        if(paceResult == null){
            throw java.lang.Exception("PACE authentication failed")
        }
        return paceResult
    }

    @Throws(CardServiceException::class)
    private fun doBAC(ps: PassportService, mrzInfo: MRZInfo): BACResult {
        val bacKey = BACKey(mrzInfo.documentNumber, mrzInfo.dateOfBirth, mrzInfo.dateOfExpiry)
        return ps.doBAC(bacKey)
    }


    private fun doEACCA(ps: PassportService, mrzInfo: MRZInfo, dg14File: DG14File?, sodFile: SODFile?): List<EACCAResult> {
        if (dg14File == null) {
            throw NullPointerException("dg14File is null")
        }

        if (sodFile == null) {
            throw NullPointerException("sodFile is null")
        }

        //Chip Authentication
        val eaccaResults = ArrayList<EACCAResult>()

        var chipAuthenticationInfo: ChipAuthenticationInfo? = null

        val chipAuthenticationPublicKeyInfos = ArrayList<ChipAuthenticationPublicKeyInfo>()
        val securityInfos = dg14File.securityInfos
        val securityInfoIterator = securityInfos.iterator()
        while (securityInfoIterator.hasNext()) {
            val securityInfo = securityInfoIterator.next()
            if (securityInfo is ChipAuthenticationInfo) {
                chipAuthenticationInfo = securityInfo
            } else if (securityInfo is ChipAuthenticationPublicKeyInfo) {
                chipAuthenticationPublicKeyInfos.add(securityInfo)
            }
        }

        val publicKeyInfoIterator = chipAuthenticationPublicKeyInfos.iterator()
        while (publicKeyInfoIterator.hasNext()) {
            val authenticationPublicKeyInfo = publicKeyInfoIterator.next()
            try {
                Log.i("EMRTD", "Chip Authentication starting")
                val doEACCA = ps.doEACCA(chipAuthenticationInfo!!.keyId, chipAuthenticationInfo.objectIdentifier, chipAuthenticationInfo.protocolOIDString, authenticationPublicKeyInfo.subjectPublicKey)
                eaccaResults.add(doEACCA)
                Log.i("EMRTD", "Chip Authentication succeeded")
            } catch (cse: CardServiceException) {
                cse.printStackTrace()
                /* NOTE: Failed? Too bad, try next public key. */
            }

        }

        return eaccaResults
    }

    fun isChipAuthenticationInfoAvailable(ps: PassportService, mrzInfo: MRZInfo, dg14File: DG14File?, sodFile: SODFile?):Boolean{
        if (dg14File == null) {
            throw NullPointerException("dg14File is null")
        }

        if (sodFile == null) {
            throw NullPointerException("sodFile is null")
        }
        val chipAuthenticationPublicKeyInfos = ArrayList<ChipAuthenticationPublicKeyInfo>()
        val securityInfos = dg14File.securityInfos
        val securityInfoIterator = securityInfos.iterator()
        while (securityInfoIterator.hasNext()) {
            val securityInfo = securityInfoIterator.next()
            if (securityInfo is ChipAuthenticationPublicKeyInfo) {
                chipAuthenticationPublicKeyInfos.add(securityInfo)
            }
        }
        return chipAuthenticationPublicKeyInfos.isNotEmpty()
    }

    @Throws(IOException::class, CardServiceException::class, GeneralSecurityException::class, IllegalArgumentException::class, NullPointerException::class)
    private fun doEACTA(ps: PassportService, mrzInfo: MRZInfo, cvcaFile: CVCAFile?, paceResult: PACEResult?, eaccaResult: EACCAResult?, cvcaKeyStores: List<KeyStore>): List<EACTAResult> {
        if (cvcaFile == null) {
            throw NullPointerException("CVCAFile is null")
        }

        if (eaccaResult == null) {
            throw NullPointerException("EACCAResult is null")
        }


        val eactaResults = ArrayList<EACTAResult>()
        val possibleCVCAReferences = arrayOf(cvcaFile.caReference, cvcaFile.altCAReference)

        //EAC
        for (caReference in possibleCVCAReferences) {
            val eacCredentials = PassportNfcUtils.getEACCredentials(caReference, cvcaKeyStores)
                ?: continue

            val privateKey = eacCredentials.privateKey
            val chain = eacCredentials.chain
            val terminalCerts = ArrayList<CardVerifiableCertificate>(chain.size)
            for (c in chain) {
                terminalCerts.add(c as CardVerifiableCertificate)
            }

            try {
                if (paceResult == null) {
                    val eactaResult = ps.doEACTA(caReference, terminalCerts, privateKey, null, eaccaResult, mrzInfo.documentNumber)
                    eactaResults.add(eactaResult)
                } else {
                    val eactaResult = ps.doEACTA(caReference, terminalCerts, privateKey, null, eaccaResult, paceResult)
                    eactaResults.add(eactaResult)
                }
            } catch (cse: CardServiceException) {
                cse.printStackTrace()
                /* NOTE: Failed? Too bad, try next public key. */
                continue
            }

            break
        }

        return eactaResults
    }


    @Throws(CardServiceException::class, IOException::class)
    private fun getComFile(ps: PassportService, maxBlockSize:Int): COMFile {
        //COM FILE
        var isComFile: InputStream? = null
        try {
            isComFile = ps.getInputStream(PassportService.EF_COM, maxBlockSize)
            return LDSFileUtil.getLDSFile(PassportService.EF_COM, isComFile) as COMFile
        } finally {
            if (isComFile != null) {
                isComFile.close()
                isComFile = null
            }
        }
    }

    @Throws(CardServiceException::class, IOException::class)
    private fun getSodFile(ps: PassportService, maxBlockSize:Int): SODFile {
        //SOD FILE
        var isSodFile: InputStream? = null
        try {
            isSodFile = ps.getInputStream(PassportService.EF_SOD, maxBlockSize)
            return LDSFileUtil.getLDSFile(PassportService.EF_SOD, isSodFile) as SODFile
        } finally {
            if (isSodFile != null) {
                isSodFile.close()
                isSodFile = null
            }
        }
    }

    @Throws(CardServiceException::class, IOException::class)
    private fun getDG1File(ps: PassportService, maxBlockSize:Int): DG1File {
        // Basic data
        var isDG1: InputStream? = null
        try {
            isDG1 = ps.getInputStream(PassportService.EF_DG1, maxBlockSize)
            return LDSFileUtil.getLDSFile(PassportService.EF_DG1, isDG1) as DG1File
        } finally {
            if (isDG1 != null) {
                isDG1.close()
                isDG1 = null
            }
        }
    }

    @Throws(CardServiceException::class, IOException::class)
    private fun getDG2File(ps: PassportService, maxBlockSize:Int): DG2File {
        // Basic data
        var isDG2: InputStream? = null
        try {
            isDG2 = ps.getInputStream(PassportService.EF_DG2, maxBlockSize)
            return LDSFileUtil.getLDSFile(PassportService.EF_DG2, isDG2) as DG2File
        } finally {
            if (isDG2 != null) {
                isDG2.close()
                isDG2 = null
            }
        }
    }

    @Throws(CardServiceException::class, IOException::class)
    private fun getDG3File(ps: PassportService, maxBlockSize:Int): DG3File {
        // Basic data
        var isDG3: InputStream? = null
        try {
            isDG3 = ps.getInputStream(PassportService.EF_DG3, maxBlockSize)
            return LDSFileUtil.getLDSFile(PassportService.EF_DG3, isDG3) as DG3File
        } finally {
            if (isDG3 != null) {
                isDG3.close()
                isDG3 = null
            }
        }
    }

    @Throws(CardServiceException::class, IOException::class)
    private fun getDG5File(ps: PassportService, maxBlockSize:Int): DG5File {
        // Basic data
        var isDG5: InputStream? = null
        try {
            isDG5 = ps.getInputStream(PassportService.EF_DG5, maxBlockSize)
            return LDSFileUtil.getLDSFile(PassportService.EF_DG5, isDG5) as DG5File
        } finally {
            if (isDG5 != null) {
                isDG5.close()
                isDG5 = null
            }
        }
    }

    @Throws(CardServiceException::class, IOException::class)
    private fun getDG7File(ps: PassportService, maxBlockSize:Int): DG7File {
        // Basic data
        var isDG7: InputStream? = null
        try {
            isDG7 = ps.getInputStream(PassportService.EF_DG7, maxBlockSize)
            return LDSFileUtil.getLDSFile(PassportService.EF_DG7, isDG7) as DG7File
        } finally {
            if (isDG7 != null) {
                isDG7.close()
                isDG7 = null
            }
        }
    }

    @Throws(CardServiceException::class, IOException::class)
    private fun getDG11File(ps: PassportService, maxBlockSize:Int): DG11File {
        // Basic data
        var isDG11: InputStream? = null
        try {
            isDG11 = ps.getInputStream(PassportService.EF_DG11, maxBlockSize)
            return LDSFileUtil.getLDSFile(PassportService.EF_DG11, isDG11) as DG11File
        } finally {
            if (isDG11 != null) {
                isDG11.close()
                isDG11 = null
            }
        }
    }

    @Throws(CardServiceException::class, IOException::class)
    private fun getDG12File(ps: PassportService, maxBlockSize:Int): DG12File {
        // Basic data
        var isDG12: InputStream? = null
        try {
            isDG12 = ps.getInputStream(PassportService.EF_DG12, maxBlockSize)
            return LDSFileUtil.getLDSFile(PassportService.EF_DG12, isDG12) as DG12File
        } finally {
            if (isDG12 != null) {
                isDG12.close()
                isDG12 = null
            }
        }
    }

    @Throws(CardServiceException::class, IOException::class)
    private fun getDG14File(ps: PassportService, maxBlockSize:Int): DG14File {
        // Basic data
        var isDG14: InputStream? = null
        try {
            isDG14 = ps.getInputStream(PassportService.EF_DG14, maxBlockSize)
            return LDSFileUtil.getLDSFile(PassportService.EF_DG14, isDG14) as DG14File
        } finally {
            if (isDG14 != null) {
                isDG14.close()
                isDG14 = null
            }
        }
    }

    @Throws(CardServiceException::class, IOException::class)
    private fun getDG15File(ps: PassportService, maxBlockSize:Int): DG15File {
        // Basic data
        var isDG15: InputStream? = null
        try {
            isDG15 = ps.getInputStream(PassportService.EF_DG15, maxBlockSize)
            return LDSFileUtil.getLDSFile(PassportService.EF_DG15, isDG15) as DG15File
        } finally {
            if (isDG15 != null) {
                isDG15.close()
                isDG15 = null
            }
        }
    }

    @Throws(CardServiceException::class, IOException::class)
    private fun getCVCAFile(ps: PassportService, maxBlockSize:Int): CVCAFile {
        // Basic data
        var isEF_CVCA: InputStream? = null
        try {
            isEF_CVCA = ps.getInputStream(PassportService.EF_CVCA, maxBlockSize)
            return LDSFileUtil.getLDSFile(PassportService.EF_CVCA, isEF_CVCA) as CVCAFile
        } finally {
            if (isEF_CVCA != null) {
                isEF_CVCA.close()
                isEF_CVCA = null
            }
        }
    }

    private fun toDataGroupList(tagList: IntArray?): List<Int>? {
        if (tagList == null) {
            return null
        }
        val dgNumberList = ArrayList<Int>(tagList.size)
        for (tag in tagList) {
            try {
                val dgNumber = LDSFileUtil.lookupDataGroupNumberByTag(tag)
                dgNumberList.add(dgNumber)
            } catch (nfe: NumberFormatException) {
                Log.w(TAG, "Could not find DG number for tag: " + Integer.toHexString(tag))
                nfe.printStackTrace()
            }

        }
        return dgNumberList
    }

    companion object {
        private val TAG = PassportNFC::class.java.simpleName

        private val BC_PROVIDER = JMRTDSecurityProvider.spongyCastleProvider

        private val EMPTY_TRIED_BAC_ENTRY_LIST = emptyList<BACKey>()
        private val EMPTY_CERTIFICATE_CHAIN = emptyList<Certificate>()

        public val MAX_BLOCK_SIZE:Int= PassportService.DEFAULT_MAX_BLOCKSIZE
        public val MAX_TRANSCEIVE_LENGTH_FOR_SECURE_MESSAGING:Int= PassportService.NORMAL_MAX_TRANCEIVE_LENGTH
        public val MAX_TRANSCEIVE_LENGTH_FOR_PACE:Int= PassportService.NORMAL_MAX_TRANCEIVE_LENGTH
    }

}
