package example.jllarraz.com.passportreader.utils

import android.net.Uri
import android.util.Log
import net.sf.scuba.data.Country
import org.jmrtd.JMRTDSecurityProvider
import org.spongycastle.jce.provider.BouncyCastleProvider
import java.io.*
import java.security.KeyStore
import java.security.KeyStoreException
import java.security.NoSuchAlgorithmException
import java.security.Security
import java.security.cert.*
import java.util.*
import javax.security.auth.x500.X500Principal
import kotlin.collections.ArrayList


class KeyStoreUtils {


    @Throws(KeyStoreException::class, NoSuchAlgorithmException::class, CertificateException::class, IOException::class)
    fun toKeyStore(certificates: Map<String, X509Certificate>): KeyStore? {
        val jmrtdProvIndex = JMRTDSecurityProvider.beginPreferBouncyCastleProvider()
        return try {
            val keyStore: KeyStore = KeyStore.getInstance("PKCS12")
            keyStore.load(null)
            for ((alias, certificate) in certificates) {
                println("DEBUG: adding certificate \"$alias\" to key store.")
                keyStore.setCertificateEntry(alias, certificate)
            }
            keyStore
        } finally {
            JMRTDSecurityProvider.endPreferBouncyCastleProvider(jmrtdProvIndex)
        }
    }

    @Throws(KeyStoreException::class, NoSuchAlgorithmException::class, CertificateException::class, IOException::class, IllegalStateException::class, IllegalArgumentException::class)
    fun toKeyStoreFile(certificates: Map<String, X509Certificate>, outputDir:File, fileName:String="csca.ks", password:String=""): Uri? {
        val toKeyStore = toKeyStore(certificates)
        /* Prepare output directory. */

        if (!outputDir.exists()) {
            Log.d("", "DEBUG: output dir " + outputDir.path.toString() + " doesn't exist, creating it.")
            if (!outputDir.mkdirs()) {
                throw IllegalStateException("Could not create output dir \"" + outputDir.path.toString() + "\"")
            }
        }

        if (!outputDir.isDirectory) {
            throw IllegalArgumentException("Output dir is not a directory")
        }

        /* Write to keystore. */
        val outFile = File(outputDir, fileName)
        val out = FileOutputStream(outFile)
        toKeyStore?.store(out, "".toCharArray())

        out.flush()
        out.close()
        return Uri.fromFile(outFile)
    }

    fun readKeystoreFromFile(folder:File, fileName:String="csca.ks", password:String=""):KeyStore?{
        try{
            val file = File(folder, fileName)
            val keyStore: KeyStore = KeyStore.getInstance("PKCS12")
            val fileInputStream = FileInputStream(file)
            keyStore.load(fileInputStream, password.toCharArray())
            return keyStore
        }catch (e:java.lang.Exception) {
            return null
        }
    }

    @Throws(CertificateEncodingException::class, IOException::class)
    fun toCertDir(certificates: Map<String, X509Certificate>, outputDir: String) {
        for ((alias, certificate) in certificates) {
            val outFile = File(outputDir, alias)
            val dataOut = DataOutputStream(FileOutputStream(outFile))
            dataOut.write(certificate.encoded)
            dataOut.close()
        }
    }

    fun getCountry(principal: X500Principal): Country? {
        val issuerName: String = principal.getName("RFC1779")
        val startIndex = issuerName.indexOf("C=")
        require(startIndex >= 0) { "Could not get country from issuer name, $issuerName" }
        var endIndex = issuerName.indexOf(",", startIndex)
        if (endIndex < 0) {
            endIndex = issuerName.length
        }
        val countryCode = issuerName.substring(startIndex + 2, endIndex).trim { it <= ' ' }.toUpperCase()
        return try {
            Country.getInstance(countryCode)
        } catch (e: Exception) {
            object : Country() {
                override fun valueOf(): Int {
                    return -1
                }

                override fun getName(): String {
                    return "Unknown country ($countryCode)"
                }

                override fun getNationality(): String {
                    return "Unknown nationality ($countryCode)"
                }

                override fun toAlpha2Code(): String {
                    return countryCode
                }

                override fun toAlpha3Code(): String {
                    return "X$countryCode"
                }
            }
        }
    }

    fun toMap(certificates:List<Certificate>):Map<String, X509Certificate>{
        val treeMap = TreeMap<String, X509Certificate>()
        var i = 0
        for(certificate in certificates){
            val x509Certificate = certificate as X509Certificate
            val issuer = x509Certificate.getIssuerX500Principal()
            val subject = x509Certificate.getSubjectX500Principal()
            val serial = x509Certificate.getSerialNumber()
            val country = getCountry(issuer)
            val isSelfSigned = (issuer == null && subject == null) || subject.equals(issuer)
            val outName = country!!.toAlpha2Code().toLowerCase().toString() + "_" + (if (isSelfSigned) "root_" else "link_") + (++i) + ".cer"
            treeMap.put(outName, x509Certificate)

        }
        return treeMap
    }
    fun toList(keyStore: KeyStore):List<Certificate>{
        val aliases = keyStore.aliases()
        val list = ArrayList<Certificate>()
        for(alias in aliases) {
            val certificate = keyStore.getCertificate(alias)
            list.add(certificate)
        }
        return list
    }

    fun toCertStore(type:String="Collection", keyStore: KeyStore):CertStore{
        return CertStore.getInstance(type, CollectionCertStoreParameters(toList(keyStore)))
    }

    fun toAnchors(certificates: Collection<Certificate>): Set<TrustAnchor>{
        val anchors = HashSet<TrustAnchor>(certificates.size)
        for (certificate in certificates) {
            if (certificate is X509Certificate) {
                anchors.add(TrustAnchor(certificate, null))
            }
        }
        return anchors
    }




    companion object{
        init {
            Security.insertProviderAt(org.spongycastle.jce.provider.BouncyCastleProvider(), 1)
        }
    }
}