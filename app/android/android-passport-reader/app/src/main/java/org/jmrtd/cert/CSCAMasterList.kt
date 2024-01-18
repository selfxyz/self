package org.jmrtd.cert


import org.spongycastle.asn1.*
import org.spongycastle.asn1.pkcs.SignedData
import org.spongycastle.jce.provider.X509CertificateObject
import java.io.ByteArrayInputStream
import java.io.IOException
import java.security.cert.CertSelector
import java.security.cert.Certificate
import java.security.cert.X509CertSelector
import java.security.cert.X509Certificate
import java.util.*

class CSCAMasterList private constructor() {
    private val certificates: MutableList<Certificate>

    /**
     * Constructs a master lsit from a collection of certificates.
     *
     * @param certificates a collection of certificates
     */
    constructor(certificates: Collection<Certificate>?) : this() {
        this.certificates.addAll(certificates!!)
    }

    @JvmOverloads
    constructor(binary: ByteArray, selector: CertSelector = IDENTITY_SELECTOR) : this() {
        certificates.addAll(searchCertificates(binary, selector))
    }

    fun getCertificates(): List<Certificate> {
        return certificates
    }

    companion object {
        /** Use this to get all certificates, including link certificates.  */
        private val IDENTITY_SELECTOR: CertSelector = object : X509CertSelector() {
            override fun match(cert: Certificate): Boolean {
                return if (cert !is X509Certificate) {
                    false
                } else true
            }

            override fun clone(): Any {
                return this
            }
        }

        /** Use this to get self-signed certificates only. (Excludes link certificates.)  */
        private val SELF_SIGNED_SELECTOR: CertSelector = object : X509CertSelector() {
            override fun match(cert: Certificate): Boolean {
                if (cert !is X509Certificate) {
                    return false
                }
                val x509Cert = cert
                val issuer = x509Cert.issuerX500Principal
                val subject = x509Cert.subjectX500Principal
                return issuer == null && subject == null || subject == issuer
            }

            override fun clone(): Any {
                return this
            }
        }

        /* PRIVATE METHODS BELOW */
        private fun searchCertificates(binary: ByteArray, selector: CertSelector): List<Certificate> {
            val result: MutableList<Certificate> = ArrayList()
            try {
                val sequence = ASN1Sequence.getInstance(binary) as ASN1Sequence
                val signedDataList: List<SignedData>? = getSignedDataFromDERObject(sequence, null)
                for (signedData in signedDataList!!) {

                    //          ASN1Set certificatesASN1Set = signedData.getCertificates();
                    //          Enumeration certificatesEnum = certificatesASN1Set.getObjects();
                    //          while (certificatesEnum.hasMoreElements()) {
                    //              Object certificateObject = certificatesEnum.nextElement();
                    //              // TODO: interpret certificateObject, and check signature
                    //          }
                    val contentInfo = signedData.contentInfo
                    val content: Any = contentInfo.content
                    val certificates: Collection<Certificate>? = getCertificatesFromDERObject(content, null)
                    for (certificate in certificates!!) {
                        if (selector.match(certificate)) {
                            result.add(certificate)
                        }
                    }
                }
            } catch (e: Exception) {
                e.printStackTrace()
            }
            return result
        }

        private fun getSignedDataFromDERObject(o: Any, result: MutableList<SignedData>?): MutableList<SignedData>? {
            var result = result
            if (result == null) {
                result = ArrayList()
            }
            try {
                val signedData = SignedData.getInstance(o)
                if (signedData != null) {
                    result.add(signedData)
                }
                return result
            } catch (e: Exception) {
            }
            if (o is DERTaggedObject) {
                val childObject = o.getObject()
                return getSignedDataFromDERObject(childObject, result)
            } else if (o is ASN1Sequence) {
                val derObjects = o.objects
                while (derObjects.hasMoreElements()) {
                    val nextObject = derObjects.nextElement()
                    result = getSignedDataFromDERObject(nextObject, result)
                }
                return result
            } else if (o is ASN1Set) {
                val derObjects = o.objects
                while (derObjects.hasMoreElements()) {
                    val nextObject = derObjects.nextElement()
                    result = getSignedDataFromDERObject(nextObject, result)
                }
                return result
            } else if (o is DEROctetString) {
                val octets = o.octets
                val derInputStream = ASN1InputStream(ByteArrayInputStream(octets))
                try {
                    while (true) {
                        val derObject = derInputStream.readObject() ?: break
                        result = getSignedDataFromDERObject(derObject, result)
                    }
                    derInputStream.close()
                } catch (ioe: IOException) {
                    ioe.printStackTrace()
                }
                return result
            }
            return result
        }

        private fun getCertificatesFromDERObject(o: Any, certificates: MutableCollection<Certificate>?): MutableCollection<Certificate>? {
            var certificates = certificates
            if (certificates == null) {
                certificates = ArrayList()
            }
            try {
                val certAsASN1Object = org.spongycastle.asn1.x509.Certificate.getInstance(o)
                certificates.add(X509CertificateObject(certAsASN1Object)) // NOTE: >= BC 1.48
                //          certificates.add(new X509CertificateObject(X509CertificateStructure.getInstance(certAsASN1Object))); // NOTE: <= BC 1.47
                return certificates
            } catch (e: Exception) {
            }
            if (o is DERTaggedObject) {
                val childObject = o.getObject()
                return getCertificatesFromDERObject(childObject, certificates)
            } else if (o is ASN1Sequence) {
                val derObjects = o.objects
                while (derObjects.hasMoreElements()) {
                    val nextObject = derObjects.nextElement()
                    certificates = getCertificatesFromDERObject(nextObject, certificates)
                }
                return certificates
            } else if (o is ASN1Set) {
                val derObjects = o.objects
                while (derObjects.hasMoreElements()) {
                    val nextObject = derObjects.nextElement()
                    certificates = getCertificatesFromDERObject(nextObject, certificates)
                }
                return certificates
            } else if (o is DEROctetString) {
                val octets = o.octets
                val derInputStream = ASN1InputStream(ByteArrayInputStream(octets))
                try {
                    while (true) {
                        val derObject = derInputStream.readObject() ?: break
                        certificates = getCertificatesFromDERObject(derObject, certificates)
                    }
                } catch (ioe: IOException) {
                    ioe.printStackTrace()
                }
                return certificates
            } else if (o is SignedData) {
                //          ASN1Set certificatesASN1Set = signedData.getCertificates();
                //          Enumeration certificatesEnum = certificatesASN1Set.getObjects();
                //          while (certificatesEnum.hasMoreElements()) {
                //              Object certificateObject = certificatesEnum.nextElement();
                //              // TODO: interpret certificateObject, and check signature
                //          }
                val contentInfo = o.contentInfo
                val content: Any = contentInfo.content
                return getCertificatesFromDERObject(content, certificates)
            }
            return certificates
        }
    }

    /** Private constructor, only used locally.  */
    init {
        certificates = ArrayList(256)
    }
}