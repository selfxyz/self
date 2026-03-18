// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

package xyz.self.sdk.models

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

class NfcScanStateTest {
    @Test
    fun waiting_for_tag_is_zero_percent() {
        assertEquals(0, NfcScanState.WAITING_FOR_TAG.percent)
    }

    @Test
    fun complete_is_100_percent() {
        assertEquals(100, NfcScanState.COMPLETE.percent)
    }

    @Test
    fun percentages_monotonically_increase() {
        val states = NfcScanState.entries
        for (i in 1 until states.size) {
            assertTrue(
                states[i].percent >= states[i - 1].percent,
                "${states[i].name} (${states[i].percent}%) should be >= ${states[i - 1].name} (${states[i - 1].percent}%)",
            )
        }
    }

    @Test
    fun all_states_have_non_blank_messages() {
        for (state in NfcScanState.entries) {
            assertTrue(
                state.message.isNotBlank(),
                "${state.name} should have a non-blank message",
            )
        }
    }

    @Test
    fun has_expected_state_count() {
        assertEquals(8, NfcScanState.entries.size)
    }
}
