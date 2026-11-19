// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

package xyz.self.sdk.core.bridge.generated

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class StoragePolicyTableTest {
    private fun firstRow(
        namespace: StorageNamespace,
        key: String,
    ): StoragePolicyRow? = StoragePolicyTable.rows.firstOrNull { it.namespace == namespace && Regex(it.pattern).matches(key) }

    @Test
    fun tableConstants() {
        assertEquals(1, StoragePolicyTable.VERSION)
        assertEquals(128, StoragePolicyTable.KEY_MAX_LENGTH)
        assertEquals(StorageProtection.NONE, StoragePolicyTable.DEFAULT_PROTECTION)
        assertEquals(13, StoragePolicyTable.rows.size)
    }

    @Test
    fun theRecoveryPhraseNeedsUserPresence() {
        assertEquals(
            StoragePolicyRule.Minimum(StorageProtection.USER_PRESENCE),
            firstRow(StorageNamespace.WEB, "self_mnemonic")?.rule,
        )
    }

    @Test
    fun thePrivateKeyIsForbidden() {
        assertEquals(StoragePolicyRule.Forbidden, firstRow(StorageNamespace.WEB, "self_private_key")?.rule)
    }

    @Test
    fun aPatternMatchesTheWholeKeyOnly() {
        val documentKey = "self_doc_" + "0a".repeat(32)

        assertEquals(
            StoragePolicyRule.Minimum(StorageProtection.NONE),
            firstRow(StorageNamespace.WEB, documentKey)?.rule,
        )
        assertNull(firstRow(StorageNamespace.WEB, documentKey + "0"))
        assertNull(firstRow(StorageNamespace.WEB, "x_self_mnemonic"))
        assertNull(firstRow(StorageNamespace.WEB, "self_doc_" + "0A".repeat(32)))
    }

    @Test
    fun anEscapedDotMatchesADotOnly() {
        assertEquals("migration\\.state", firstRow(StorageNamespace.NATIVE, "migration.state")?.pattern)
        assertNull(firstRow(StorageNamespace.NATIVE, "migrationXstate"))
        assertNull(firstRow(StorageNamespace.WEB, "migration.state"))
    }
}
