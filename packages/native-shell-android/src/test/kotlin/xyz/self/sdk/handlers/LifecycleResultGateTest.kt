// SPDX-License-Identifier: BUSL-1.1

package xyz.self.sdk.handlers

import kotlin.test.Test
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class LifecycleResultGateTest {

    @Test
    fun `first tryClaim succeeds`() {
        val gate = LifecycleResultGate()

        assertTrue(gate.tryClaim())
        assertTrue(gate.isClaimed)
    }

    @Test
    fun `second tryClaim fails after first claim`() {
        val gate = LifecycleResultGate()

        assertTrue(gate.tryClaim())
        assertFalse(gate.tryClaim())
    }

    @Test
    fun `isClaimed is false before any claim`() {
        val gate = LifecycleResultGate()

        assertFalse(gate.isClaimed)
    }

    @Test
    fun `dismiss-then-setResult scenario - second caller is rejected`() {
        val gate = LifecycleResultGate()

        // dismiss claims the gate
        val dismissClaimed = gate.tryClaim()
        // setResult tries to claim after dismiss
        val setResultClaimed = gate.tryClaim()

        assertTrue(dismissClaimed, "dismiss should win the gate")
        assertFalse(setResultClaimed, "setResult should be rejected after dismiss")
    }

    @Test
    fun `setResult-then-dismiss scenario - dismiss does not reclaim`() {
        val gate = LifecycleResultGate()

        // setResult claims the gate
        val setResultClaimed = gate.tryClaim()
        // dismiss tries to claim after setResult
        val dismissClaimed = gate.tryClaim()

        assertTrue(setResultClaimed, "setResult should win the gate")
        assertFalse(dismissClaimed, "dismiss should not reclaim after setResult")
    }

    @Test
    fun `many claims after first all fail`() {
        val gate = LifecycleResultGate()

        assertTrue(gate.tryClaim())
        repeat(10) {
            assertFalse(gate.tryClaim())
        }
    }
}
