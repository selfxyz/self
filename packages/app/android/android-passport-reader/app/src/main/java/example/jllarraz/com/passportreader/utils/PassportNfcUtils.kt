package example.jllarraz.com.passportreader.utils

import android.content.Context
import android.graphics.Bitmap
import android.util.Log

import org.jmrtd.cert.CVCPrincipal
import org.jmrtd.cert.CardVerifiableCertificate
import org.jmrtd.lds.icao.DG2File
import org.jmrtd.lds.icao.DG3File
import org.jmrtd.lds.icao.DG5File
import org.jmrtd.lds.icao.DG7File
import org.jmrtd.lds.iso19794.FaceImageInfo
import org.jmrtd.lds.iso19794.FingerImageInfo
import org.spongycastle.jce.provider.BouncyCastleProvider

import java.io.ByteArrayInputStream
import java.io.DataInputStream
import java.io.IOException
import java.io.InputStream

import java.math.BigInteger
import java.security.GeneralSecurityException
import java.security.KeyStore
import java.security.PrivateKey
import java.security.Security
import java.security.cert.CertPathBuilder
import java.security.cert.CertPathBuilderException
import java.security.cert.CertStore
import java.security.cert.Certificate
import java.security.cert.CollectionCertStoreParameters
import java.security.cert.PKIXBuilderParameters
import java.security.cert.PKIXCertPathBuilderResult
import java.security.cert.TrustAnchor
import java.security.cert.X509CertSelector
import java.security.cert.X509Certificate
import java.util.ArrayList
import java.util.Arrays
import java.util.Collections

import javax.security.auth.x500.X500Principal

object PassportNfcUtils {

    private val TAG = PassportNfcUtils::class.java.simpleName


    private val IS_PKIX_REVOCATION_CHECING_ENABLED = false

    init {
        Security.addProvider(BouncyCastleProvider())
    }


    @Throws(IOException::class)
    fun retrieveFaceImage(context: Context, dg2File: DG2File): Bitmap {
        val allFaceImageInfos = ArrayList<FaceImageInfo>()
        val faceInfos = dg2File.faceInfos
        for (faceInfo in faceInfos) {
            allFaceImageInfos.addAll(faceInfo.faceImageInfos)
        }

        if (!allFaceImageInfos.isEmpty()) {
            val faceImageInfo = allFaceImageInfos.iterator().next()
            return toBitmap(faceImageInfo.imageLength, faceImageInfo.imageInputStream, faceImageInfo.mimeType)
        }
        throw IOException("Unable to decodeImage Image")
    }

    @Throws(IOException::class)
    fun retrievePortraitImage(context: Context, dg5File: DG5File): Bitmap {
        val faceInfos = dg5File.images
        if (!faceInfos.isEmpty()) {
            val faceImageInfo = faceInfos.iterator().next()
            return toBitmap(faceImageInfo.imageLength, faceImageInfo.imageInputStream, faceImageInfo.mimeType)
        }
        throw IOException("Unable to decodeImage Image")
    }

    @Throws(IOException::class)
    fun retrieveSignatureImage(context: Context, dg7File: DG7File): Bitmap {
        val displayedImageInfos = dg7File.images
        if (!displayedImageInfos.isEmpty()) {
            val displayedImageInfo = displayedImageInfos.iterator().next()
            return toBitmap(displayedImageInfo.imageLength, displayedImageInfo.imageInputStream, displayedImageInfo.mimeType)
        }
        throw IOException("Unable to decodeImage Image")
    }

    @Throws(IOException::class)
    fun retrieveFingerPrintImage(context: Context, dg3File: DG3File): List<Bitmap> {
        val allFingerImageInfos = ArrayList<FingerImageInfo>()
        val fingerInfos = dg3File.fingerInfos

        val fingerprintsImage = ArrayList<Bitmap>()
        for (fingerInfo in fingerInfos) {
            allFingerImageInfos.addAll(fingerInfo.fingerImageInfos)
        }

        val iterator = allFingerImageInfos.iterator()
        while (iterator.hasNext()) {
            val fingerImageInfo = iterator.next()
            val bitmap = toBitmap(fingerImageInfo.imageLength, fingerImageInfo.imageInputStream, fingerImageInfo.mimeType)
            fingerprintsImage.add(bitmap)
        }

        if (fingerprintsImage.isEmpty()) {
            throw IOException("Unable to decodeImage Finger print Image")
        }
        return fingerprintsImage

    }


    @Throws(IOException::class)
    private fun toBitmap(imageLength: Int, inputStream: InputStream, mimeType: String): Bitmap {
        val dataInputStream = DataInputStream(inputStream)
        val buffer = ByteArray(imageLength)
        dataInputStream.readFully(buffer, 0, imageLength)
        val byteArrayInputStream = ByteArrayInputStream(buffer, 0, imageLength)
        return ImageUtil.decodeImage(byteArrayInputStream, imageLength, mimeType)
    }


    @Throws(GeneralSecurityException::class)
    fun getEACCredentials(caReference: CVCPrincipal, cvcaStores: List<KeyStore>): EACCredentials? {
        for (cvcaStore in cvcaStores) {
            val eacCredentials = getEACCredentials(caReference, cvcaStore)
            if (eacCredentials != null) {
                return eacCredentials
            }
        }
        return null
    }

    /**
     * Searches the key store for a relevant terminal key and associated certificate chain.
     *
     * @param caReference
     * @param cvcaStore should contain a single key with certificate chain
     * @return
     * @throws GeneralSecurityException
     */
    @Throws(GeneralSecurityException::class)
    private fun getEACCredentials(caReference: CVCPrincipal?, cvcaStore: KeyStore): EACCredentials? {
        if (caReference == null) {
            throw IllegalArgumentException("CA reference cannot be null")
        }

        var privateKey: PrivateKey? = null
        var chain: Array<Certificate>? = null

        val aliases = Collections.list(cvcaStore.aliases())
        for (alias in aliases) {
            if (cvcaStore.isKeyEntry(alias)) {
                val key = cvcaStore.getKey(alias, "".toCharArray())
                if (key is PrivateKey) {
                    privateKey = key
                } else {
                    Log.w(TAG, "skipping non-private key $alias")
                    continue
                }
                chain = cvcaStore.getCertificateChain(alias)
                return EACCredentials(privateKey, chain!!)
            } else if (cvcaStore.isCertificateEntry(alias)) {
                val certificate = cvcaStore.getCertificate(alias) as CardVerifiableCertificate
                val authRef = certificate.authorityReference
                val holderRef = certificate.holderReference
                if (caReference != authRef) {
                    continue
                }
                /* See if we have a private key for that certificate. */
                privateKey = cvcaStore.getKey(holderRef.name, "".toCharArray()) as PrivateKey
                chain = cvcaStore.getCertificateChain(holderRef.name)
                if (privateKey == null) {
                    continue
                }
                Log.i(TAG, "found a key, privateKey = $privateKey")
                return EACCredentials(privateKey, chain!!)
            }
            if (privateKey == null || chain == null) {
                Log.e(TAG, "null chain or key for entry " + alias + ": chain = " + Arrays.toString(chain) + ", privateKey = " + privateKey)
                continue
            }
        }
        return null
    }

    /**
     * Builds a certificate chain to an anchor using the PKIX algorithm.
     *
     * @param docSigningCertificate the start certificate
     * @param sodIssuer the issuer of the start certificate (ignored unless `docSigningCertificate` is `null`)
     * @param sodSerialNumber the serial number of the start certificate (ignored unless `docSigningCertificate` is `null`)
     *
     * @return the certificate chain
     */
    fun getCertificateChain(docSigningCertificate: X509Certificate?,
                            sodIssuer: X500Principal,
                            sodSerialNumber: BigInteger,
                            cscaStores: List<CertStore>,
                            cscaTrustAnchors: Set<TrustAnchor>): List<Certificate> {
        val chain = ArrayList<Certificate>()
        val selector = X509CertSelector()
        try {

            if (docSigningCertificate != null) {
                selector.certificate = docSigningCertificate
            } else {
                selector.issuer = sodIssuer
                selector.serialNumber = sodSerialNumber
            }

            val docStoreParams = CollectionCertStoreParameters(setOf<Certificate>(docSigningCertificate as Certificate))
            val docStore = CertStore.getInstance("Collection", docStoreParams)

            val builder = CertPathBuilder.getInstance("PKIX", "SC")//Spungy castle
            val buildParams = PKIXBuilderParameters(cscaTrustAnchors, selector)
            buildParams.addCertStore(docStore)
            for (trustStore in cscaStores) {
                buildParams.addCertStore(trustStore)
            }
            buildParams.isRevocationEnabled = IS_PKIX_REVOCATION_CHECING_ENABLED /* NOTE: set to false for checking disabled. */

            var result: PKIXCertPathBuilderResult? = null

            try {
                result = builder.build(buildParams) as PKIXCertPathBuilderResult
            } catch (cpbe: CertPathBuilderException) {
                cpbe.printStackTrace()
                /* NOTE: ignore, result remain null */
            }

            if (result != null) {
                val pkixCertPath = result.certPath
                if (pkixCertPath != null) {
                    chain.addAll(pkixCertPath.certificates)
                }
            }
            if (docSigningCertificate != null && !chain.contains(docSigningCertificate)) {
                /* NOTE: if doc signing certificate not in list, we add it ourselves. */
                Log.w(TAG, "Adding doc signing certificate after PKIXBuilder finished")
                chain.add(0, docSigningCertificate)
            }
            if (result != null) {
                val trustAnchorCertificate = result.trustAnchor.trustedCert
                if (trustAnchorCertificate != null && !chain.contains(trustAnchorCertificate)) {
                    /* NOTE: if trust anchor not in list, we add it ourselves. */
                    Log.w(TAG, "Adding trust anchor certificate after PKIXBuilder finished")
                    chain.add(trustAnchorCertificate)
                }
            }
        } catch (e: Exception) {
            e.printStackTrace()
            Log.i(TAG, "Building a chain failed (" + e.message + ").")
        }

        return chain
    }













}
