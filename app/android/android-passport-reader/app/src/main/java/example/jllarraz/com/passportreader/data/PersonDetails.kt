package example.jllarraz.com.passportreader.data

import android.os.Parcel
import android.os.Parcelable

import net.sf.scuba.data.Gender

import org.jmrtd.lds.icao.MRZInfo

import java.util.ArrayList
import java.util.Date

class PersonDetails : Parcelable {


    var documentCode: String? = null
    var issuingState: String? = null
    var primaryIdentifier: String? = null
    var secondaryIdentifier: String? = null
    var nationality: String? = null
    var documentNumber: String? = null
    var dateOfBirth: String? = null
    var dateOfExpiry: String? = null
    var optionalData1: String? = null /* NOTE: holds personal number for some issuing states (e.g. NL), but is used to hold (part of) document number for others. */
    var optionalData2: String? = null
    var gender: Gender? = Gender.UNKNOWN

    constructor()

    constructor(`in`: Parcel) {


        this.documentCode = if (`in`.readInt() == 1) `in`.readString() else null
        this.issuingState = if (`in`.readInt() == 1) `in`.readString() else null
        this.primaryIdentifier = if (`in`.readInt() == 1) `in`.readString() else null
        this.secondaryIdentifier = if (`in`.readInt() == 1) `in`.readString() else null
        this.nationality = if (`in`.readInt() == 1) `in`.readString() else null
        this.documentNumber = if (`in`.readInt() == 1) `in`.readString() else null
        this.dateOfBirth = if (`in`.readInt() == 1) `in`.readString() else null
        this.dateOfExpiry = if (`in`.readInt() == 1) `in`.readString() else null
        this.optionalData1 = if (`in`.readInt() == 1) `in`.readString() else null
        this.optionalData2 = if (`in`.readInt() == 1) `in`.readString() else null
        this.gender = if (`in`.readInt() == 1) Gender.valueOf(`in`.readString()!!) else Gender.UNKNOWN
    }

    override fun describeContents(): Int {
        return 0
    }

    override fun writeToParcel(dest: Parcel, flags: Int) {
        dest.writeInt(if (documentCode != null) 1 else 0)
        if (documentCode != null) {
            dest.writeString(documentCode)
        }

        dest.writeInt(if (issuingState != null) 1 else 0)
        if (issuingState != null) {
            dest.writeString(issuingState)
        }

        dest.writeInt(if (primaryIdentifier != null) 1 else 0)
        if (primaryIdentifier != null) {
            dest.writeString(primaryIdentifier)
        }

        dest.writeInt(if (secondaryIdentifier != null) 1 else 0)
        if (secondaryIdentifier != null) {
            dest.writeString(secondaryIdentifier)
        }

        dest.writeInt(if (nationality != null) 1 else 0)
        if (nationality != null) {
            dest.writeString(nationality)
        }

        dest.writeInt(if (documentNumber != null) 1 else 0)
        if (documentNumber != null) {
            dest.writeString(documentNumber)
        }

        dest.writeInt(if (dateOfBirth != null) 1 else 0)
        if (dateOfBirth != null) {
            dest.writeString(dateOfBirth)
        }

        dest.writeInt(if (dateOfExpiry != null) 1 else 0)
        if (dateOfExpiry != null) {
            dest.writeString(dateOfExpiry)
        }

        dest.writeInt(if (optionalData1 != null) 1 else 0)
        if (optionalData1 != null) {
            dest.writeString(optionalData1)
        }

        dest.writeInt(if (optionalData2 != null) 1 else 0)
        if (optionalData2 != null) {
            dest.writeString(optionalData2)
        }

        dest.writeInt(if (gender != null) 1 else 0)
        if (optionalData2 != null) {
            dest.writeString(gender!!.name)
        }


    }

    companion object {
        @JvmField
        val CREATOR: Parcelable.Creator<*> = object : Parcelable.Creator<PersonDetails> {
            override fun createFromParcel(pc: Parcel): PersonDetails {
                return PersonDetails(pc)
            }

            override fun newArray(size: Int): Array<PersonDetails?> {
                return arrayOfNulls(size)
            }
        }
    }
}
