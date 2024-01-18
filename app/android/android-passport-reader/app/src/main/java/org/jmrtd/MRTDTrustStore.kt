/*
 * JMRTD - A Java API for accessing machine readable travel documents.
 *
 * Copyright (C) 2006 - 2013  The JMRTD team
 *
 * This library is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 2.1 of the License, or (at your option) any later version.
 *
 * This library is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public
 * License along with this library; if not, write to the Free Software
 * Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA 02110-1301 USA
 *
 * $Id:  $
 */

package org.jmrtd

import java.io.IOException
import java.io.InputStream
import java.net.MalformedURLException
import java.net.URI
import java.net.URLConnection
import java.security.cert.CertSelector
import java.security.cert.CertStore
import java.security.cert.CertStoreException
import java.security.cert.CertStoreParameters
import java.security.cert.Certificate
import java.security.cert.CertificateException
import java.security.cert.CertificateFactory
import java.security.cert.CollectionCertStoreParameters
import java.security.cert.TrustAnchor
import java.security.cert.X509CertSelector
import java.security.cert.X509Certificate
import java.util.ArrayList
import java.util.Collections
import java.util.HashSet
import java.util.logging.Logger

import javax.security.auth.x500.X500Principal

import org.jmrtd.cert.KeyStoreCertStoreParameters
import org.jmrtd.cert.PKDCertStoreParameters
import org.jmrtd.cert.PKDMasterListCertStoreParameters
import java.security.*

/**
 * Provides lookup for certificates, keys, CRLs used in
 * document validation and access control for data groups.
 *
 * @author The JMRTD team (info@jmrtd.org)
 *
 * @version $Revision: $
 */
class MRTDTrustStore
/**
 * Constructs an instance.
 *
 * @param cscaAnchors the root certificates for document validation
 * @param cscaStores the certificates used in document validation
 * @param cvcaStores the certificates used for access to EAC protected data groups
 */
@JvmOverloads constructor(var cscaAnchors: MutableSet<TrustAnchor>? = HashSet(), var cscaStores: MutableList<CertStore>? = ArrayList(), var cvcaStores: MutableList<KeyStore>? = ArrayList()) {

    fun clear() {
        this.cscaAnchors = HashSet()
        this.cscaStores = ArrayList()
        this.cvcaStores = ArrayList()
    }

    /**
     * Gets the root certificates for document validation.
     *
     * @return the cscaAnchors
     */
    fun getCSCAAnchors(): Set<TrustAnchor>? {
        return cscaAnchors
    }

    /**
     * Gets the certificates used in document validation.
     *
     * @return the cscaStores
     */
    fun getCSCAStores(): List<CertStore>? {
        return cscaStores
    }

    /**
     * Gets the certificates used for access to EAC protected data groups.
     *
     * @return the cvcaStores
     */
    fun getCVCAStores(): List<KeyStore>? {
        return cvcaStores
    }

    /**
     * Adds a root certificate for document validation.
     *
     * @param trustAnchor a trustAnchor
     */
    fun addCSCAAnchor(trustAnchor: TrustAnchor) {
        cscaAnchors!!.add(trustAnchor)
    }

    /**
     * Adds root certificates for document validation.
     *
     * @param trustAnchors a collection of trustAnchors
     */
    fun addCSCAAnchors(trustAnchors: Collection<TrustAnchor>) {
        cscaAnchors!!.addAll(trustAnchors)
    }

    /**
     * Adds a certificate store for document validation based on a URI.
     *
     * @param uri the URI
     */
    fun addCSCAStore(uri: URI?) {
        if (uri == null) {
            LOGGER.severe("uri == null")
            return
        }
        val scheme = uri.scheme
        if (scheme == null) {
            LOGGER.severe("scheme == null, location = $uri")
            return
        }
        try {
            if (scheme.equals("ldap", ignoreCase = true)) {
                addAsPKDStoreCSCACertStore(uri)
            } else {
                /* The scheme is probably "file" or "http"? Going to just open a connection. */
                try {
                    addAsKeyStoreCSCACertStore(uri)
                } catch (kse: Exception) {
                    try {
                        addAsSingletonCSCACertStore(uri)
                    } catch (e: Exception) {
                        LOGGER.warning("Failed to open " + uri.toASCIIString() + " both as a keystore and as a DER certificate file")
                        kse.printStackTrace()
                        e.printStackTrace()
                    }

                }

            }
        } catch (gse: GeneralSecurityException) {
            gse.printStackTrace()
        }

    }


    /**
     * Adds multiple certificate stores for document validation based on URIs.
     *
     * @param uris the URIs
     */
    fun addCSCAStores(uris: List<URI>?) {
        if (uris == null) {
            LOGGER.severe("uris == null")
            return
        }
        for (uri in uris) {
            addCSCAStore(uri)
        }
    }

    /**
     * Adds a key store for access to EAC protected data groups based on a URI.
     *
     * @param uri the URI
     */
    fun addCVCAStore(uri: URI) {
        try {
            addAsCVCAKeyStore(uri)
        } catch (e: Exception) {
            LOGGER.warning("Exception in addCVCAStore: " + e.message)
        }

    }

    /**
     * Adds multiple key stores for access to EAC protected data groups based on URIs.
     *
     * @param uris the URIs
     */
    fun addCVCAStores(uris: List<URI>) {
        for (uri in uris) {
            addCVCAStore(uri)
        }
    }

    /**
     * Adds a certificate store for document validation.
     *
     * @param certStore the certificate store
     */
    fun addCSCAStore(certStore: CertStore) {
        cscaStores!!.add(certStore)
    }

    /**
     * Adds a key store for access to EAC protected data groups.
     *
     * @param keyStore the key store
     */
    fun addCVCAStore(keyStore: KeyStore) {
        cvcaStores!!.add(keyStore)
    }

    /**
     * Removes a trust anchor for document validation.
     *
     * @param trustAnchor the trust anchor
     */
    fun removeCSCAAnchor(trustAnchor: TrustAnchor) {
        cscaAnchors!!.remove(trustAnchor)
    }

    /**
     * Removes a certificate store for document validation.
     *
     * @param certStore the certificate store
     */
    fun removeCSCAStore(certStore: CertStore) {
        cscaStores!!.remove(certStore)
    }

    /**
     * Removes a key store for access to EAC protected data groups.
     *
     * @param keyStore the key store
     */
    fun removeCVCAStore(keyStore: KeyStore) {
        cvcaStores!!.remove(keyStore)
    }

    /* ONLY PRIVATE METHODS BELOW */

    @Throws(MalformedURLException::class, IOException::class, CertificateException::class, InvalidAlgorithmParameterException::class, NoSuchAlgorithmException::class, CertStoreException::class)
    private fun addAsSingletonCSCACertStore(uri: URI) {
        val urlConnection = uri.toURL().openConnection()
        val inputStream = urlConnection.getInputStream()
        val certFactory = CertificateFactory.getInstance("X.509", JMRTD_PROVIDER)
        val certificate = certFactory.generateCertificate(inputStream) as X509Certificate
        inputStream.close()
        val params = CollectionCertStoreParameters(setOf(certificate))
        val cscaStore = CertStore.getInstance("Collection", params)
        cscaStores!!.add(cscaStore)
        val rootCerts = cscaStore.getCertificates(SELF_SIGNED_X509_CERT_SELECTOR)
        addCSCAAnchors(getAsAnchors(rootCerts))
    }

    /**
     * Adds the CVCA key store located at `uri`.
     *
     * @param uri a URI with a key store
     */
    private fun addAsCVCAKeyStore(uri: URI) {
        addCVCAStore(getKeyStore(uri))
    }

    @Throws(NoSuchAlgorithmException::class, InvalidAlgorithmParameterException::class, CertStoreException::class)
    private fun addAsPKDStoreCSCACertStore(uri: URI) {
        /* PKD store */
        val server = uri.host
        val port = uri.port
        val params = if (port < 0) PKDCertStoreParameters(server) else PKDCertStoreParameters(server, port)
        val cscaParams = if (port < 0) PKDMasterListCertStoreParameters(server) else PKDMasterListCertStoreParameters(server, port)
        val certStore = CertStore.getInstance("PKD", params)
        if (certStore != null) {
            addCSCAStore(certStore)
        }
        val cscaStore = CertStore.getInstance("PKD", cscaParams)
        if (cscaStore != null) {
            addCSCAStore(cscaStore)
        }
        val rootCerts = cscaStore!!.getCertificates(SELF_SIGNED_X509_CERT_SELECTOR)
        addCSCAAnchors(getAsAnchors(rootCerts))
    }

    @Throws(KeyStoreException::class, InvalidAlgorithmParameterException::class, NoSuchAlgorithmException::class, CertStoreException::class)
    private fun addAsKeyStoreCSCACertStore(uri: URI) {
        val keyStore = getKeyStore(uri)
        val params = KeyStoreCertStoreParameters(keyStore)
        val certStore = CertStore.getInstance(keyStore.type, params)
        addCSCAStore(certStore)
        val rootCerts = certStore.getCertificates(SELF_SIGNED_X509_CERT_SELECTOR)
        addCSCAAnchors(getAsAnchors(rootCerts))
    }

    @Throws(KeyStoreException::class, InvalidAlgorithmParameterException::class, NoSuchAlgorithmException::class, CertStoreException::class)
    fun addAsCSCACertStore(certStore: CertStore) {
        addCSCAStore(certStore)
        val rootCerts = certStore.getCertificates(SELF_SIGNED_X509_CERT_SELECTOR)
        addCSCAAnchors(getAsAnchors(rootCerts))
    }


    private fun getKeyStore(uri: URI): KeyStore {
        /*
		 * We have to try all store types, only Bouncy Castle Store (BKS)
		 * knows about unnamed EC keys.
		 */
        val storeTypes = arrayOf("JKS", "BKS", "PKCS12")
        for (storeType in storeTypes) {
            try {
                val keyStore = KeyStore.getInstance(storeType)
                val urlConnection = uri.toURL().openConnection()
                val inputStream = urlConnection.getInputStream()
                keyStore.load(inputStream, "".toCharArray())
                inputStream.close()
                return keyStore
            } catch (e: Exception) {
                // LOGGER.warning("Could not initialize CVCA key store with type " + storeType + ": " + e.getMessage());
                // e.printStackTrace();
                continue
            }

        }
        throw IllegalArgumentException("Not a supported keystore")
    }

    companion object {

        init {
            Security.insertProviderAt(org.spongycastle.jce.provider.BouncyCastleProvider(), 1)
        }

        private val JMRTD_PROVIDER = JMRTDSecurityProvider.instance

        private val LOGGER = Logger.getLogger("org.jmrtd")

        private val SELF_SIGNED_X509_CERT_SELECTOR = object : X509CertSelector() {
            override fun match(cert: Certificate): Boolean {
                if (cert !is X509Certificate) {
                    return false
                }
                val issuer = cert.issuerX500Principal
                val subject = cert.subjectX500Principal
                return issuer == null && subject == null || subject == issuer
            }

            override fun clone(): Any {
                return this
            }
        }

        /**
         * Returns a set of trust anchors based on the X509 certificates in `certificates`.
         *
         * @param certificates a collection of X509 certificates
         *
         * @return a set of trust anchors
         */
        private fun getAsAnchors(certificates: Collection<Certificate>): Set<TrustAnchor> {
            val anchors = HashSet<TrustAnchor>(certificates.size)
            for (certificate in certificates) {
                if (certificate is X509Certificate) {
                    anchors.add(TrustAnchor(certificate, null))
                }
            }
            return anchors
        }
    }
}
/**
 * Constructs an instance.
 */


