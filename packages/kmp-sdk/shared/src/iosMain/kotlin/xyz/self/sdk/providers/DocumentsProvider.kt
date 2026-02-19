// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

package xyz.self.sdk.providers

interface DocumentsProvider {
    fun loadCatalog(): String?

    fun saveCatalog(data: String)

    fun loadById(id: String): String?

    fun save(
        id: String,
        document: String,
    )

    fun delete(id: String)
}
