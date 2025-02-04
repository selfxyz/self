package example.jllarraz.com.passportreader.ui.fragments

import android.content.Context
import android.graphics.Bitmap
import android.os.Bundle
import androidx.core.content.ContextCompat
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.ImageView
import org.jmrtd.FeatureStatus
import org.jmrtd.VerificationStatus

import java.security.MessageDigest
import java.text.SimpleDateFormat

import javax.security.auth.x500.X500Principal

import example.jllarraz.com.passportreader.R
import example.jllarraz.com.passportreader.common.IntentData
import example.jllarraz.com.passportreader.data.Passport
import example.jllarraz.com.passportreader.databinding.FragmentPassportDetailsBinding
import example.jllarraz.com.passportreader.utils.StringUtils
import java.util.*

class PassportDetailsFragment : androidx.fragment.app.Fragment() {

    private var passportDetailsFragmentListener: PassportDetailsFragmentListener? = null

    internal var simpleDateFormat = SimpleDateFormat("dd/MM/yyyy", Locale.ENGLISH)

    private var passport: Passport? = null

    private var binding:FragmentPassportDetailsBinding?=null
    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?,
                              savedInstanceState: Bundle?): View? {
        binding = FragmentPassportDetailsBinding.inflate(inflater, container, false)

        return binding?.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        val arguments = arguments
        if (arguments!!.containsKey(IntentData.KEY_PASSPORT)) {
            passport = arguments.getParcelable<Passport>(IntentData.KEY_PASSPORT)
        } else {
            //error
        }

        binding?.iconPhoto?.setOnClickListener {
            var bitmap = passport?.face
            if (bitmap == null) {
                bitmap = passport!!.portrait
            }
            if (passportDetailsFragmentListener != null) {
                passportDetailsFragmentListener?.onImageSelected(bitmap)
            }
        }
    }

    override fun onResume() {
        super.onResume()

        refreshData(passport)
    }

    private fun refreshData(passport: Passport?) {
        if (passport == null) {
            return
        }

        if (passport.face != null) {
            //Add teh face
            binding?.iconPhoto?.setImageBitmap(passport.face)
        } else if (passport.portrait != null) {
            //If we don't have the face, we try with the portrait
            binding?.iconPhoto?.setImageBitmap(passport.portrait)
        }

        val personDetails = passport.personDetails
        if (personDetails != null) {
            val name = personDetails.primaryIdentifier!!.replace("<", "")
            val surname = personDetails.secondaryIdentifier!!.replace("<", "")
            binding?.valueName?.text = getString(R.string.name, name, surname)
            binding?.valueDOB?.text = personDetails.dateOfBirth
            binding?.valueGender?.text = personDetails.gender?.name
            binding?.valuePassportNumber?.text = personDetails.documentNumber
            binding?.valueExpirationDate?.text = personDetails.dateOfExpiry
            binding?.valueIssuingState?.text = personDetails.issuingState
            binding?.valueNationality?.text = personDetails.nationality
        }

        val additionalPersonDetails = passport.additionalPersonDetails
        if (additionalPersonDetails != null) {
            //This object it's not available in the majority of passports
            binding?.cardViewAdditionalPersonInformation?.visibility = View.VISIBLE

            if (additionalPersonDetails.custodyInformation != null) {
                binding?.valueCustody?.text = additionalPersonDetails.custodyInformation
            }
            if (additionalPersonDetails.fullDateOfBirth != null) {

                binding?.valueDateOfBirth?.text = additionalPersonDetails.fullDateOfBirth
            }
            if (additionalPersonDetails.otherNames != null && additionalPersonDetails.otherNames!!.size > 0) {
                binding?.valueOtherNames?.text = arrayToString(additionalPersonDetails.otherNames!!)
            }
            if (additionalPersonDetails.otherValidTDNumbers != null && additionalPersonDetails.otherValidTDNumbers!!.size > 0) {
                binding?.valueOtherTdNumbers?.text = arrayToString(additionalPersonDetails.otherValidTDNumbers!!)
            }
            if (additionalPersonDetails.permanentAddress != null && additionalPersonDetails.permanentAddress!!.size > 0) {
                binding?.valuePermanentAddress?.text = arrayToString(additionalPersonDetails.permanentAddress!!)
            }

            if (additionalPersonDetails.personalNumber != null) {
                binding?.valuePersonalNumber?.text = additionalPersonDetails.personalNumber
            }

            if (additionalPersonDetails.personalSummary != null) {
                binding?.valuePersonalSummary?.text = additionalPersonDetails.personalSummary
            }

            if (additionalPersonDetails.placeOfBirth != null && additionalPersonDetails.placeOfBirth!!.size > 0) {
                binding?.valuePlaceOfBirth?.text = arrayToString(additionalPersonDetails.placeOfBirth!!)
            }

            if (additionalPersonDetails.profession != null) {
                binding?.valueProfession?.text = additionalPersonDetails.profession
            }

            if (additionalPersonDetails.telephone != null) {
                binding?.valueTelephone?.text = additionalPersonDetails.telephone
            }

            if (additionalPersonDetails.title != null) {
                binding?.valueTitle?.text = additionalPersonDetails.title
            }
        } else {
            binding?.cardViewAdditionalPersonInformation?.visibility = View.GONE
        }

        val additionalDocumentDetails = passport.additionalDocumentDetails
        if (additionalDocumentDetails != null) {
            binding?.cardViewAdditionalDocumentInformation?.visibility = View.VISIBLE

            if (additionalDocumentDetails.dateAndTimeOfPersonalization != null) {
                binding?.valueDatePersonalization?.text = additionalDocumentDetails.dateAndTimeOfPersonalization
            }
            if (additionalDocumentDetails.dateOfIssue != null) {
                binding?.valueDateIssue?.text = additionalDocumentDetails.dateOfIssue
            }

            if (additionalDocumentDetails.endorsementsAndObservations != null) {
                binding?.valueEndorsements?.text = additionalDocumentDetails.endorsementsAndObservations
            }

            if (additionalDocumentDetails.issuingAuthority != null) {
                binding?.valueIssuingAuthority?.text = additionalDocumentDetails.issuingAuthority
            }

            if (additionalDocumentDetails.namesOfOtherPersons != null) {
                binding?.valueNamesOtherPersons?.text = arrayToString(additionalDocumentDetails.namesOfOtherPersons!!)
            }

            if (additionalDocumentDetails.personalizationSystemSerialNumber != null) {
                binding?.valueSystemSerialNumber?.text = additionalDocumentDetails.personalizationSystemSerialNumber
            }

            if (additionalDocumentDetails.taxOrExitRequirements != null) {
                binding?.valueTaxExit?.text = additionalDocumentDetails.taxOrExitRequirements
            }
        } else {
            binding?.cardViewAdditionalDocumentInformation?.visibility = View.GONE
        }

        displayAuthenticationStatus(passport.verificationStatus, passport.featureStatus!!)
        displayWarningTitle(passport.verificationStatus, passport.featureStatus!!)


        val sodFile = passport.sodFile
        if (sodFile != null) {
            val countrySigningCertificate = sodFile.issuerX500Principal
            val dnRFC2253 = countrySigningCertificate.getName(X500Principal.RFC2253)
            val dnCANONICAL = countrySigningCertificate.getName(X500Principal.CANONICAL)
            val dnRFC1779 = countrySigningCertificate.getName(X500Principal.RFC1779)

            val name = countrySigningCertificate.name
            //new X509Certificate(countrySigningCertificate);

            val docSigningCertificate = sodFile.docSigningCertificate

            if (docSigningCertificate != null) {
                binding?.valueDocumentSigningCertificateSerialNumber?.text = docSigningCertificate.serialNumber.toString()
                binding?.valueDocumentSigningCertificatePublicKeyAlgorithm?.text = docSigningCertificate.publicKey.algorithm
                binding?.valueDocumentSigningCertificateSignatureAlgorithm?.text = docSigningCertificate.sigAlgName

                try {
                    binding?.valueDocumentSigningCertificateThumbprint?.text = StringUtils.bytesToHex(MessageDigest.getInstance("SHA-1").digest(
                            docSigningCertificate.encoded)).toUpperCase()
                } catch (e: Exception) {
                    e.printStackTrace()
                }
                binding?.valueDocumentSigningCertificateIssuer?.text = docSigningCertificate.issuerDN.name
                binding?.valueDocumentSigningCertificateSubject?.text = docSigningCertificate.subjectDN.name
                binding?.valueDocumentSigningCertificateValidFrom?.text = simpleDateFormat.format(docSigningCertificate.notBefore)
                binding?.valueDocumentSigningCertificateValidTo?.text = simpleDateFormat.format(docSigningCertificate.notAfter)

            } else {
                binding?.cardViewDocumentSigningCertificate?.visibility = View.GONE
            }

        } else {
            binding?.cardViewDocumentSigningCertificate?.visibility = View.GONE
        }
    }

    private fun displayWarningTitle(verificationStatus: VerificationStatus?, featureStatus: FeatureStatus) {
        var colorCard = android.R.color.holo_green_light
        var message = ""
        var title = ""
        if (featureStatus.hasCA() == FeatureStatus.Verdict.PRESENT) {
            if (verificationStatus!!.ca == VerificationStatus.Verdict.SUCCEEDED && verificationStatus.ht == VerificationStatus.Verdict.SUCCEEDED && verificationStatus.cs == VerificationStatus.Verdict.SUCCEEDED) {
                //Everything is fine
                colorCard = android.R.color.holo_green_light
                title = getString(R.string.document_valid_passport)
                message = getString(R.string.document_chip_content_success)
            } else if (verificationStatus.ca == VerificationStatus.Verdict.FAILED) {
                //Chip authentication failed
                colorCard = android.R.color.holo_red_light
                title = getString(R.string.document_invalid_passport)
                message = getString(R.string.document_chip_failure)
            } else if (verificationStatus.ht == VerificationStatus.Verdict.FAILED) {
                //Document information
                colorCard = android.R.color.holo_red_light
                title = getString(R.string.document_invalid_passport)
                message = getString(R.string.document_document_failure)
            } else if (verificationStatus.cs == VerificationStatus.Verdict.FAILED) {
                //CSCA information
                colorCard = android.R.color.holo_red_light
                title = getString(R.string.document_invalid_passport)
                message = getString(R.string.document_csca_failure)
            } else {
                //Unknown
                colorCard = android.R.color.darker_gray
                title = getString(R.string.document_unknown_passport_title)
                message = getString(R.string.document_unknown_passport_message)
            }
        } else if (featureStatus.hasCA() == FeatureStatus.Verdict.NOT_PRESENT) {
            if (verificationStatus!!.ht == VerificationStatus.Verdict.SUCCEEDED) {
                //Document information is fine
                colorCard = android.R.color.holo_green_light
                title = getString(R.string.document_valid_passport)
                message = getString(R.string.document_content_success)
            } else if (verificationStatus.ht == VerificationStatus.Verdict.FAILED) {
                //Document information
                colorCard = android.R.color.holo_red_light
                title = getString(R.string.document_invalid_passport)
                message = getString(R.string.document_document_failure)
            } else if (verificationStatus.cs == VerificationStatus.Verdict.FAILED) {
                //CSCA information
                colorCard = android.R.color.holo_red_light
                title = getString(R.string.document_invalid_passport)
                message = getString(R.string.document_csca_failure)
            } else {
                //Unknown
                colorCard = android.R.color.darker_gray
                title = getString(R.string.document_unknown_passport_title)
                message = getString(R.string.document_unknown_passport_message)
            }
        } else {
            //Unknown
            colorCard = android.R.color.darker_gray
            title = getString(R.string.document_unknown_passport_title)
            message = getString(R.string.document_unknown_passport_message)
        }
        binding?.cardViewWarning?.setCardBackgroundColor(resources.getColor(colorCard))
        binding?.textWarningTitle?.text = title
        binding?.textWarningMessage?.text = message
    }


    private fun displayAuthenticationStatus(verificationStatus: VerificationStatus?, featureStatus: FeatureStatus) {

        if (featureStatus.hasBAC() == FeatureStatus.Verdict.PRESENT) {
            binding?.rowBac?.visibility = View.VISIBLE
        } else {
            binding?.rowBac?.visibility = View.GONE
        }

        if (featureStatus.hasAA() == FeatureStatus.Verdict.PRESENT) {
            binding?.rowActive?.visibility = View.VISIBLE
        } else {
            binding?.rowActive?.visibility = View.GONE
        }

        if (featureStatus.hasSAC() == FeatureStatus.Verdict.PRESENT) {
            binding?.rowPace?.visibility = View.VISIBLE
        } else {
            binding?.rowPace?.visibility = View.GONE
        }

        if (featureStatus.hasCA() == FeatureStatus.Verdict.PRESENT) {
            binding?.rowChip?.visibility = View.VISIBLE
        } else {
            binding?.rowChip?.visibility = View.GONE
        }

        if (featureStatus.hasEAC() == FeatureStatus.Verdict.PRESENT) {
            binding?.rowEac?.visibility = View.VISIBLE
        } else {
            binding?.rowEac?.visibility = View.GONE
        }

        displayVerificationStatusIcon(binding?.valueBac, verificationStatus!!.bac)
        displayVerificationStatusIcon(binding?.valuePace, verificationStatus.sac)
        displayVerificationStatusIcon(binding?.valuePassive, verificationStatus.ht)
        displayVerificationStatusIcon(binding?.valueActive, verificationStatus.aa)
        displayVerificationStatusIcon(binding?.valueDocumentSigning, verificationStatus.ds)
        displayVerificationStatusIcon(binding?.valueCountrySigning, verificationStatus.cs)
        displayVerificationStatusIcon(binding?.valueChip, verificationStatus.ca)
        displayVerificationStatusIcon(binding?.valueEac, verificationStatus.eac)
    }

    private fun displayVerificationStatusIcon(imageView: ImageView?, verdict: VerificationStatus.Verdict?) {
        var verdict = verdict
        if (verdict == null) {
            verdict = VerificationStatus.Verdict.UNKNOWN
        }
        val resourceIconId: Int
        val resourceColorId: Int
        when (verdict) {
            VerificationStatus.Verdict.SUCCEEDED -> {
                resourceIconId = R.drawable.ic_check_circle_outline
                resourceColorId = android.R.color.holo_green_light
            }
            VerificationStatus.Verdict.FAILED -> {
                resourceIconId = R.drawable.ic_close_circle_outline
                resourceColorId = android.R.color.holo_red_light
            }
            VerificationStatus.Verdict.NOT_PRESENT -> {
                resourceIconId = R.drawable.ic_close_circle_outline
                resourceColorId = android.R.color.darker_gray
            }
            VerificationStatus.Verdict.NOT_CHECKED -> {
                resourceIconId = R.drawable.ic_help_circle_outline
                resourceColorId = android.R.color.holo_orange_light
            }
            VerificationStatus.Verdict.UNKNOWN -> {
                resourceIconId = R.drawable.ic_close_circle_outline
                resourceColorId = android.R.color.darker_gray
            }
            else -> {
                resourceIconId = R.drawable.ic_close_circle_outline
                resourceColorId = android.R.color.darker_gray
            }
        }

        imageView!!.setImageResource(resourceIconId)
        imageView.setColorFilter(ContextCompat.getColor(requireActivity(), resourceColorId), android.graphics.PorterDuff.Mode.SRC_IN)
    }


    override fun onAttach(context: Context) {
        super.onAttach(context)
        val activity = activity
        if (activity is PassportDetailsFragment.PassportDetailsFragmentListener) {
            passportDetailsFragmentListener = activity
        }
    }

    override fun onDetach() {
        passportDetailsFragmentListener = null
        super.onDetach()

    }

    interface PassportDetailsFragmentListener {
        fun onImageSelected(bitmap: Bitmap?)
    }


    private fun arrayToString(array: List<String>): String {
        var temp = ""
        val iterator = array.iterator()
        while (iterator.hasNext()) {
            temp += iterator.next() + "\n"
        }
        if (temp.endsWith("\n")) {
            temp = temp.substring(0, temp.length - "\n".length)
        }
        return temp
    }

    override fun onDestroyView() {
        binding = null
        super.onDestroyView()
    }

    companion object {


        fun newInstance(passport: Passport): PassportDetailsFragment {
            val myFragment = PassportDetailsFragment()
            val args = Bundle()
            args.putParcelable(IntentData.KEY_PASSPORT, passport)
            myFragment.arguments = args
            return myFragment
        }
    }
}
