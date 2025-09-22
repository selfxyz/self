package io.tradle.nfc

import net.sf.scuba.smartcards.APDUEvent
import net.sf.scuba.smartcards.APDUListener
import net.sf.scuba.smartcards.CommandAPDU
import net.sf.scuba.smartcards.ResponseAPDU
import org.jmrtd.WrappedAPDUEvent
import android.util.Log

class APDULogger : APDUListener {
    
    private var moduleReference: RNPassportReaderModule? = null
    
    private val sessionContext = mutableMapOf<String, Any>()
    
    fun setModuleReference(module: RNPassportReaderModule) {
        moduleReference = module
    }
    
    fun setContext(key: String, value: Any) {
        sessionContext[key] = value
    }
    
    fun clearContext() {
        sessionContext.clear()
    }
    
    override fun exchangedAPDU(event: APDUEvent) {
        try {
            val entry = createLogEntry(event)
            
            logToAnalytics(entry)
            
        } catch (e: Exception) {
            Log.e("APDULogger", "Error exchanging APDU", e)
        }
    }
    
    private fun createLogEntry(event: APDUEvent): APDULogEntry {
        val command = event.commandAPDU
        val response = event.responseAPDU
        val timestamp = System.currentTimeMillis()
        
        val entry = APDULogEntry(
            timestamp = timestamp,
            commandHex = command.bytes.toHexString(),
            responseHex = response.bytes.toHexString(),
            statusWord = response.sw,
            statusWordHex = "0x${response.sw.toString(16).uppercase().padStart(4, '0')}",
            commandLength = command.bytes.size,
            responseLength = response.bytes.size,
            dataLength = response.data.size,
            isWrapped = event is WrappedAPDUEvent,
            plainCommandHex = if (event is WrappedAPDUEvent) event.plainTextCommandAPDU.bytes.toHexString() else null,
            plainResponseHex = if (event is WrappedAPDUEvent) event.plainTextResponseAPDU.bytes.toHexString() else null,
            plainCommandLength = if (event is WrappedAPDUEvent) event.plainTextCommandAPDU.bytes.size else null,
            plainResponseLength = if (event is WrappedAPDUEvent) event.plainTextResponseAPDU.bytes.size else null,
            plainDataLength = if (event is WrappedAPDUEvent) event.plainTextResponseAPDU.data.size else null,
            context = sessionContext.toMap()
        )
        
        return entry
    }
    
    private fun ByteArray.toHexString(): String {
        return joinToString("") { "%02X".format(it) }
    }
    
    private fun logToAnalytics(entry: APDULogEntry) {
        try {
            val params = mutableMapOf<String, Any>().apply {
                put("timestamp", entry.timestamp)
                put("command_hex", entry.commandHex)
                put("response_hex", entry.responseHex)
                put("status_word", entry.statusWord)
                put("status_word_hex", entry.statusWordHex)
                put("command_length", entry.commandLength)
                put("response_length", entry.responseLength)
                put("data_length", entry.dataLength)
                put("is_wrapped", entry.isWrapped)
                put("context", entry.context)
                
                entry.plainCommandHex?.let { put("plain_command_hex", it) }
                entry.plainResponseHex?.let { put("plain_response_hex", it) }
                entry.plainCommandLength?.let { put("plain_command_length", it) }
                entry.plainResponseLength?.let { put("plain_response_length", it) }
                entry.plainDataLength?.let { put("plain_data_length", it) }
            }
            
            moduleReference?.logAnalyticsEvent("nfc_apdu_exchange", params)
            
        } catch (e: Exception) {
            Log.e("APDULogger", "Error logging to analytics", e)
        }
    }
}

data class APDULogEntry(
    val timestamp: Long,
    val commandHex: String,
    val responseHex: String,
    val statusWord: Int,
    val statusWordHex: String,
    val commandLength: Int,
    val responseLength: Int,
    val dataLength: Int,
    val isWrapped: Boolean,
    val plainCommandHex: String?,
    val plainResponseHex: String?,
    val plainCommandLength: Int?,
    val plainResponseLength: Int?,
    val plainDataLength: Int?,
    val context: Map<String, Any>
)