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

import java.security.cert.CertStoreParameters

/**
 * Parameters for PKD backed certificate store.
 *
 * @author The JMRTD team (info@jmrtd.org)
 *
 * @version $Revision: $
 */
open class PKDCertStoreParameters @JvmOverloads constructor(
        /**
         * @return the serverName
         */
        val serverName: String = DEFAULT_SERVER_NAME,
        /**
         * @return the port
         */
        val port: Int = DEFAULT_PORT,
        /**
         * @return the baseDN
         */
        val baseDN: String = DEFAULT_BASE_DN) : Cloneable, CertStoreParameters {

    constructor(serverName: String, baseDN: String) : this(serverName, DEFAULT_PORT, baseDN)

    /**
     * Makes a copy of this object.
     *
     * @return a copy of this object
     */
    override fun clone(): Any {
        return PKDCertStoreParameters(serverName, port, baseDN)
    }

    override fun toString(): String {
        return "PKDCertStoreParameters [$serverName:$port/$baseDN]"
    }

    override fun equals(otherObj: Any?): Boolean {
        if (otherObj == null) {
            return false
        }
        if (otherObj === this) {
            return true
        }
        if (this.javaClass != otherObj.javaClass) {
            return false
        }
        val otherParams = otherObj as PKDCertStoreParameters?
        return (otherParams!!.serverName == this.serverName
                && otherParams.port == this.port
                && otherParams.baseDN == this.baseDN)
    }

    override fun hashCode(): Int {
        return (serverName.hashCode() + port + baseDN.hashCode()) * 2 + 303
    }

    companion object {

        private val DEFAULT_SERVER_NAME = "localhost"
        private val DEFAULT_PORT = 389
        private val DEFAULT_BASE_DN = "dc=data,dc=pkdDownload"
    }
}
