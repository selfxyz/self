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

import java.security.InvalidAlgorithmParameterException
import java.security.KeyStore
import java.security.KeyStoreException
import java.security.cert.CRL
import java.security.cert.CRLSelector
import java.security.cert.CertSelector
import java.security.cert.CertStoreException
import java.security.cert.CertStoreParameters
import java.security.cert.CertStoreSpi
import java.security.cert.Certificate
import java.util.ArrayList
import java.util.Enumeration

/**
 * Certificate store backed by key store.
 *
 * @author The JMRTD team (info@jmrtd.org)
 *
 * @version $Revision: $
 */
class KeyStoreCertStoreSpi @Throws(InvalidAlgorithmParameterException::class)
constructor(params: CertStoreParameters) : CertStoreSpi(params) {

    private val keyStore: KeyStore

    init {
        keyStore = (params as KeyStoreCertStoreParameters).keyStore
    }

    @Throws(CertStoreException::class)
    override fun engineGetCertificates(selector: CertSelector): Collection<Certificate> {
        try {
            val certificates = ArrayList<Certificate>(keyStore.size())
            val aliases = keyStore.aliases()
            while (aliases.hasMoreElements()) {
                val alias = aliases.nextElement() as String
                if (keyStore.isCertificateEntry(alias)) {
                    val certificate = keyStore.getCertificate(alias)
                    if (selector.match(certificate)) {
                        certificates.add(certificate)
                    }
                }
            }
            return certificates
        } catch (kse: KeyStoreException) {
            throw CertStoreException(kse.message)
        }

    }

    @Throws(CertStoreException::class)
    override fun engineGetCRLs(selector: CRLSelector): Collection<CRL> {
        return ArrayList(0)
    }
}
