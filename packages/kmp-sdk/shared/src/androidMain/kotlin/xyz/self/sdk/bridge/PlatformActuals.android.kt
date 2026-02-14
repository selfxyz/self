package xyz.self.sdk.bridge

internal actual fun currentTimeMillis(): Long = System.currentTimeMillis()

internal actual fun generateUuid(): String =
    java.util.UUID
        .randomUUID()
        .toString()
