package example.jllarraz.com.passportreader.network

import io.reactivex.Single
import okhttp3.ResponseBody
import retrofit2.http.*

interface MasterListApi {
    @Headers(value = ["Content-type: text/xml; charset=utf-8"])
    @GET("descargas/mrtd/SpanishMasterList.zip")
    @Streaming
    fun getSpanishMasterList(
    ): Single<ResponseBody>
}