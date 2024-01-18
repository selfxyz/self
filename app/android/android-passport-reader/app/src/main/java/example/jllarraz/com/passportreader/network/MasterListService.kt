package example.jllarraz.com.passportreader.network

import android.content.Context
import android.util.Log
import io.reactivex.Single
import io.reactivex.android.schedulers.AndroidSchedulers
import io.reactivex.schedulers.Schedulers
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import org.jmrtd.cert.CSCAMasterList
import retrofit2.Retrofit
import retrofit2.adapter.rxjava2.RxJava2CallAdapterFactory
import retrofit2.converter.gson.GsonConverterFactory
import java.io.ByteArrayInputStream
import java.nio.charset.Charset
import java.security.cert.Certificate
import java.util.concurrent.TimeUnit
import java.util.zip.ZipInputStream

class MasterListService constructor(var context: Context, var baseUrl: String) {

    private lateinit var api: MasterListApi
    init {
        initRetrofit()
    }

    fun getSpanishMasterList(): Single<ArrayList<Certificate>> {
        return api.getSpanishMasterList()
                .flatMap { result ->
                    val certificates = ArrayList<Certificate>()
                    val byteStream = result.byteStream()
                    val zipInputStream = ZipInputStream(byteStream)
                    var entry = zipInputStream.nextEntry
                    while (entry != null) {
                        val name = entry.name
                        if (!entry.isDirectory) {
                            try {
                                val readBytes = zipInputStream.readBytes()
                                val cscaMasterList = CSCAMasterList(readBytes)
                                certificates.addAll(cscaMasterList.getCertificates())
                            } catch (e: Exception) {
                                e.printStackTrace()
                               // throw Exception("Unable to extract the zip file: " + name)
                            } finally {
                            }
                        }
                        entry = zipInputStream.nextEntry
                    }

                    Single.fromCallable{certificates}
                }
    }

    private fun initRetrofit() {

        val httpLoggingInterceptor = HttpLoggingInterceptor()
        val httpClient = OkHttpClient.Builder()
                .addInterceptor(httpLoggingInterceptor.apply { httpLoggingInterceptor.level = HttpLoggingInterceptor.Level.BASIC })
                .readTimeout(120, TimeUnit.SECONDS)
                .connectTimeout(120, TimeUnit.SECONDS)
                .build()

        api = Retrofit.Builder()
                .baseUrl(baseUrl)
                .client(httpClient)
                .addCallAdapterFactory(RxJava2CallAdapterFactory.create())
                .addConverterFactory(GsonConverterFactory.create())
                .build()
                .create(MasterListApi::class.java)
    }
}