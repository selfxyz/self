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

package org.jmrtd.cert

import java.io.IOException
import java.io.InputStream
import java.net.URI
import java.net.URLConnection
import java.security.KeyStore
import java.security.KeyStoreException
import java.security.cert.CertStoreParameters
import java.util.logging.Logger

import org.jmrtd.JMRTDSecurityProvider

/**
 * Parameters for key store backed certificate store.
 *
 * @author The JMRTD team (info@jmrtd.org)
 *
 * @version $Revision: $
 */
class KeyStoreCertStoreParameters(val keyStore: KeyStore) : Cloneable, CertStoreParameters {

    @Throws(KeyStoreException::class)
    constructor(uri: URI, password: CharArray) : this(uri, DEFAULT_ALGORITHM, password)

    @Throws(KeyStoreException::class)
    @JvmOverloads
    constructor(uri: URI, algorithm: String = DEFAULT_ALGORITHM, password: CharArray = DEFAULT_PASSWORD) : this(readKeyStore(uri, algorithm, password))

    /**
     * Makes a shallow copy of this object as this
     * class is immutable.
     *
     * @return a shallow copy of this object
     */
    override fun clone(): Any {
        return KeyStoreCertStoreParameters(keyStore)
    }

    companion object {

        private val LOGGER = Logger.getLogger("org.jmrtd")

        private val DEFAULT_ALGORITHM = "JKS"
        private val DEFAULT_PASSWORD = "".toCharArray()

        @Throws(KeyStoreException::class)
        private fun readKeyStore(location: URI, keyStoreType: String, password: CharArray): KeyStore {
            try {
                val n = JMRTDSecurityProvider.beginPreferBouncyCastleProvider()
                val uc = location.toURL().openConnection()
                val inputStream = uc.getInputStream()
                var ks: KeyStore? = null
                ks = KeyStore.getInstance(keyStoreType)
                try {
                    LOGGER.info("KeystoreCertStore will use provider for KeyStore: " + ks!!.provider.javaClass.canonicalName!!)
                    ks.load(inputStream, password)
                } catch (ioe: IOException) {
                    LOGGER.warning("Cannot read this file \"$location\" as keystore")
                    // ioe.printStackTrace();
                }

                inputStream.close()
                JMRTDSecurityProvider.endPreferBouncyCastleProvider(n)
                return ks
            } catch (e: Exception) {
                // e.printStackTrace();
                throw KeyStoreException("Error getting keystore: " + e.message)
            }

        }
    }
}
