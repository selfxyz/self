import android.app.Application
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.WritableMap
import io.tradle.nfc.RNPassportReaderModule
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.robolectric.RuntimeEnvironment

class RNPassportReaderModuleTest {
    private lateinit var module: TestModule

    @Before
    fun setUp() {
        val context = object : ReactApplicationContext(RuntimeEnvironment.getApplication() as Application) {}
        module = TestModule(context)
    }

    @Test
    fun enablesNfcWhenFocusGained() {
        module.scanPromise = DummyPromise()
        module.onWindowFocusChanged(true)
        assertTrue(module.enableCalled)
    }

    @Test
    fun doesNotEnableWhenNoScan() {
        module.onWindowFocusChanged(true)
        assertFalse(module.enableCalled)
    }

    private class TestModule(context: ReactApplicationContext) : RNPassportReaderModule(context) {
        var enableCalled = false
        override fun enableNfcForScanning() { enableCalled = true }
    }

    private class DummyPromise : Promise {
        override fun resolve(value: Any?) {}
        override fun reject(code: String, message: String?) {}
        override fun reject(code: String, throwable: Throwable?) {}
        override fun reject(code: String, message: String?, throwable: Throwable?) {}
        override fun reject(throwable: Throwable) {}
        override fun reject(throwable: Throwable, userInfo: WritableMap) {}
        override fun reject(code: String, userInfo: WritableMap) {}
        override fun reject(code: String, throwable: Throwable?, userInfo: WritableMap) {}
        override fun reject(code: String, message: String?, userInfo: WritableMap) {}
        override fun reject(code: String?, message: String?, throwable: Throwable?, userInfo: WritableMap?) {}
        override fun reject(message: String) {}
    }
}
