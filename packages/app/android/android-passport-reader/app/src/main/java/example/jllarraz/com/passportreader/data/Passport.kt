package example.jllarraz.com.passportreader.data

import android.graphics.Bitmap
import android.os.Parcel
import android.os.Parcelable

import org.jmrtd.FeatureStatus
import org.jmrtd.VerificationStatus
import org.jmrtd.lds.SODFile

import java.util.ArrayList
import java.util.HashMap

class Passport : Parcelable {

    var sodFile: SODFile? = null
    var face: Bitmap? = null
    var portrait: Bitmap? = null
    var signature: Bitmap? = null
    var fingerprints: List<Bitmap>? = null
    var personDetails: PersonDetails? = null
    var additionalPersonDetails: AdditionalPersonDetails? = null
    var additionalDocumentDetails: AdditionalDocumentDetails? = null
    var featureStatus: FeatureStatus? = null
    var verificationStatus: VerificationStatus? = null

    constructor(`in`: Parcel) {


        fingerprints = ArrayList()
        this.face = if (`in`.readInt() == 1) `in`.readParcelable(Bitmap::class.java.classLoader) else null
        this.portrait = if (`in`.readInt() == 1) `in`.readParcelable(Bitmap::class.java.classLoader) else null
        this.personDetails = if (`in`.readInt() == 1) `in`.readParcelable(PersonDetails::class.java.classLoader) else null
        this.additionalPersonDetails = if (`in`.readInt() == 1) `in`.readParcelable(AdditionalPersonDetails::class.java.classLoader) else null

        if (`in`.readInt() == 1) {
            `in`.readList(fingerprints!!, Bitmap::class.java.classLoader)
        }

        this.signature = if (`in`.readInt() == 1) `in`.readParcelable(Bitmap::class.java.classLoader) else null
        this.additionalDocumentDetails = if (`in`.readInt() == 1) `in`.readParcelable(AdditionalDocumentDetails::class.java.classLoader) else null
        if (`in`.readInt() == 1) {
            sodFile = `in`.readSerializable() as SODFile
        }

        if (`in`.readInt() == 1) {
            featureStatus = `in`.readParcelable(FeatureStatus::class.java.classLoader)
        }

        if (`in`.readInt() == 1) {
            featureStatus = `in`.readParcelable(FeatureStatus::class.java.classLoader)
        }

        if (`in`.readInt() == 1) {
            verificationStatus = `in`.readParcelable(VerificationStatus::class.java.classLoader)
        }

    }

    constructor() {
        fingerprints = ArrayList()
        featureStatus = FeatureStatus()
        verificationStatus = VerificationStatus()
    }

    override fun describeContents(): Int {
        return 0
    }

    override fun writeToParcel(dest: Parcel, flags: Int) {
        dest.writeInt(if (face != null) 1 else 0)
        if (face != null) {
            dest.writeParcelable(face, flags)
        }

        dest.writeInt(if (portrait != null) 1 else 0)
        if (portrait != null) {
            dest.writeParcelable(portrait, flags)
        }

        dest.writeInt(if (personDetails != null) 1 else 0)
        if (personDetails != null) {
            dest.writeParcelable(personDetails, flags)
        }

        dest.writeInt(if (additionalPersonDetails != null) 1 else 0)
        if (additionalPersonDetails != null) {
            dest.writeParcelable(additionalPersonDetails, flags)
        }

        dest.writeInt(if (fingerprints != null) 1 else 0)
        if (fingerprints != null) {
            dest.writeList(fingerprints)
        }

        dest.writeInt(if (signature != null) 1 else 0)
        if (signature != null) {
            dest.writeParcelable(signature, flags)
        }

        dest.writeInt(if (additionalDocumentDetails != null) 1 else 0)
        if (additionalDocumentDetails != null) {
            dest.writeParcelable(additionalDocumentDetails, flags)
        }

        dest.writeInt(if (sodFile != null) 1 else 0)
        if (sodFile != null) {
            dest.writeSerializable(sodFile)
        }

        dest.writeInt(if (featureStatus != null) 1 else 0)
        if (featureStatus != null) {
            dest.writeParcelable(featureStatus, flags)
        }

        dest.writeInt(if (verificationStatus != null) 1 else 0)
        if (verificationStatus != null) {
            dest.writeParcelable(verificationStatus, flags)
        }

    }

    companion object {

        @JvmField
        val CREATOR: Parcelable.Creator<*> = object : Parcelable.Creator<Passport> {
            override fun createFromParcel(pc: Parcel): Passport {
                return Passport(pc)
            }

            override fun newArray(size: Int): Array<Passport?> {
                return arrayOfNulls(size)
            }
        }
    }
}
