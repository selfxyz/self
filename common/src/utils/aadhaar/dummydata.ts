import { IdFields, extractPhoto, getRandomBytes } from './utils'
import pako from 'pako'

// This modify the test data to make it compliant with the secure Aadhaar QR V2 2022
// - Adds the version specifier at the beginning 'V2'
// - Mocks last 4 digits of phone number '1234' after VTC
// - Refresh timestamp data to now
// - Optionally it can take parameters to change the test data fields (dob, pinCode, gender, state)
export const createCustomV2TestData = ({
  signedData,
  dob,
  pincode,
  gender,
  state,
  photo,
}: {
  signedData: Uint8Array
  dob?: string
  pincode?: string
  gender?: string
  state?: string
  photo?: boolean
}) => {
  const allDataParsed: number[][] = []
  const delimiterIndices: number[] = []
  let countDelimiter = 0
  let temp: number[] = []
  for (let i = 0; i < signedData.length; i++) {
    if (countDelimiter < 16) {
      if (signedData[i] !== 255) {
        temp.push(signedData[i])
      } else {
        countDelimiter += 1
        allDataParsed.push(temp)
        delimiterIndices.push(i)
        temp = []
      }
    } else {
      break
    }
  }

  // Set new timestamp to the time of the signature
  const newDateString = returnNewDateString()
  const newTimestamp = new TextEncoder().encode(newDateString)
  const signedDataWithNewTimestamp = replaceBytesBetween(
    signedData,
    newTimestamp,
    6,
    5 + newTimestamp.length
  )

  let modifiedSignedData: Uint8Array = signedDataWithNewTimestamp

  if (dob) {
    const newDOB = new TextEncoder().encode(dob)
    modifiedSignedData = replaceBytesBetween(
      modifiedSignedData,
      newDOB,
      delimiterIndices[IdFields.DOB - 1] + 1,
      delimiterIndices[IdFields.DOB - 1] + allDataParsed[IdFields.DOB].length
    )
  }

  if (gender) {
    const newGender = new TextEncoder().encode(gender)
    modifiedSignedData = replaceBytesBetween(
      modifiedSignedData,
      newGender,
      delimiterIndices[IdFields.Gender - 1] + 1,
      delimiterIndices[IdFields.Gender - 1] +
        allDataParsed[IdFields.Gender].length
    )
  }

  if (pincode) {
    const newPincode = new TextEncoder().encode(pincode)
    modifiedSignedData = replaceBytesBetween(
      modifiedSignedData,
      newPincode,
      delimiterIndices[IdFields.PinCode - 1] + 1,
      delimiterIndices[IdFields.PinCode - 1] +
        allDataParsed[IdFields.PinCode].length
    )
  }

  if (state) {
    const newState = new TextEncoder().encode(state)
    modifiedSignedData = replaceBytesBetween(
      modifiedSignedData,
      newState,
      delimiterIndices[IdFields.State - 1] + 1,
      delimiterIndices[IdFields.State - 1] +
        allDataParsed[IdFields.State].length
    )
  }

  if (photo) {
    const { begin, dataLength } = extractPhoto(
      Array.from(modifiedSignedData),
      modifiedSignedData.length
    )
    const photoLength = dataLength - begin

    modifiedSignedData = replaceBytesBetween(
      modifiedSignedData,
      getRandomBytes(photoLength - 1),
      begin + 1,
      begin + photoLength - 1
    )
  }

  const versionSpecifier = new Uint8Array([86, 50, 255]) // 'V2' in ASCII followed by 255
  const number1234 = new Uint8Array([49, 50, 51, 52, 255]) // '1234' in ASCII followed by 255
  const beforeInsertion = new Uint8Array(
    modifiedSignedData.slice(0, getEndIndex(modifiedSignedData))
  )
  const afterInsertion = new Uint8Array(
    modifiedSignedData.slice(getEndIndex(modifiedSignedData))
  )

  // Combine all parts together
  const newData = new Uint8Array(
    versionSpecifier.length +
      beforeInsertion.length +
      number1234.length +
      afterInsertion.length
  )
  newData.set(versionSpecifier, 0)
  newData.set(beforeInsertion, versionSpecifier.length)
  newData.set(number1234, versionSpecifier.length + beforeInsertion.length)
  newData.set(
    afterInsertion,
    versionSpecifier.length + beforeInsertion.length + number1234.length
  )

  return newData
}

export function timestampToUTCUnix(rawData: Uint8Array) {
  const extractedArray: Uint8Array = new Uint8Array(10)

  for (let i = 0; i < 10; i++) {
    extractedArray[i] = rawData[i + 9]
  }

  const timestampString = Buffer.from(extractedArray).toString()

  const result = `${timestampString.slice(0, 4)}-${timestampString.slice(
    4,
    6
  )}-${timestampString.slice(6, 8)}T${timestampString.slice(8, 10)}:00:00.000Z`

  const dateObj = new Date(result)

  dateObj.setUTCHours(dateObj.getUTCHours() - 5)
  dateObj.setUTCMinutes(dateObj.getUTCMinutes() - 30)

  return Math.floor(dateObj.getTime() / 1000)
}

export function dateToUnixTimestamp(dateStr: string): number {
  // Parse the date string into a Date object
  const parts = dateStr.split('-')
  const day = parseInt(parts[0], 10)
  const month = parseInt(parts[1], 10) - 1 // Month is 0-indexed in JavaScript Date
  const year = parseInt(parts[2], 10)

  const date = new Date(Date.UTC(year, month, day, 0, 0, 0, 0))

  // Convert the Date object to a UNIX timestamp
  const unixTimestamp = date.getTime() / 1000

  return unixTimestamp + 19800
}

// Will return an object with all the ID fields in string format
export function returnFullId(signedData: Uint8Array) {
  const allDataParsed: number[][] = []
  let countDelimiter = 0
  let temp: number[] = []
  for (let i = 0; i < signedData.length; i++) {
    if (countDelimiter < 18) {
      if (signedData[i] !== 255) {
        temp.push(signedData[i])
      } else {
        countDelimiter += 1
        allDataParsed.push(temp)
        temp = []
      }
    }
  }

  const ID: { [key: string]: string } = {}
  for (let i = 0; i < allDataParsed.length; i++) {
    let result = ''
    for (let j = 0; j < allDataParsed[i].length; j++) {
      result += String.fromCharCode(allDataParsed[i][j])
    }
    ID[IdFields[i - 1]] = result
  }

  return ID
}

export function extractFieldByIndex(
  data: Uint8Array,
  index: number
): Uint8Array {
  let start = -1
  let end = data.length
  let fieldIndex = -1

  for (let i = 0; i < data.length; i++) {
    if (data[i] === 255) {
      fieldIndex++
      if (fieldIndex === index) {
        start = i
      } else if (fieldIndex === index + 1) {
        end = i
        break
      }
    }
  }

  if (start !== -1 && start < end) {
    // Include the starting delimiter in the result
    return data.slice(start, end)
  }

  return new Uint8Array() // Field not found
}

export function compressByteArray(byteArray: Uint8Array): Uint8Array {
  const compressedArray = pako.deflate(byteArray)
  return new Uint8Array(compressedArray)
}

export function getEndIndex(byteArray: Uint8Array): number {
  let countDelimiter = 0
  let endIndex = 0
  for (let i = 0; i < byteArray.length; i++) {
    if (countDelimiter < 16) {
      if (byteArray[i] !== 255) {
        continue
      } else {
        countDelimiter += 1
      }
    } else {
      endIndex = i
      break
    }
  }

  return endIndex
}

export function replaceBytesBetween(
  arr: Uint8Array,
  replaceWith: Uint8Array,
  start: number,
  end: number
): Uint8Array {
  if (start < 0 || end >= arr.length || start > end) {
    console.error('Invalid start or end index.')
    return arr
  }

  const before = arr.subarray(0, start)

  const after = arr.subarray(end + 1)

  const result = new Uint8Array(
    before.length + replaceWith.length + after.length
  )

  result.set(before, 0)
  result.set(replaceWith, before.length)
  result.set(after, before.length + replaceWith.length)

  return result
}

// Return timestamp in format “DDMMYYYYHHMMSSsss” (including milliseconds)
export function returnNewDateString(): string {
  const newDate = new Date()

  // Convert the UTC date to IST by adding 5 hours and 30 minutes
  const offsetHours = 5
  const offsetMinutes = 30
  newDate.setUTCHours(newDate.getUTCHours() + offsetHours)
  newDate.setUTCMinutes(newDate.getUTCMinutes() + offsetMinutes)

  return (
    newDate.getUTCFullYear().toString() +
    (newDate.getUTCMonth() + 1).toString().padStart(2, '0') +
    newDate.getUTCDate().toString().padStart(2, '0') +
    newDate.getUTCHours().toString().padStart(2, '0') +
    newDate.getUTCMinutes().toString().padStart(2, '0') +
    newDate.getUTCSeconds().toString().padStart(2, '0') +
    newDate.getUTCMilliseconds().toString().padStart(3, '0')
  )
}

export function convertByteArrayToBigInt(byteArray: Uint8Array): bigint {
  let result = BigInt(0)
  for (let i = 0; i < byteArray.length; i++) {
    result = result * BigInt(256) + BigInt(byteArray[i])
  }
  return result
}

export const rawDataToCompressedQR = (data: Uint8Array) => {
  const compressedDataBytes = compressByteArray(data)
  const compressedBigInt = convertByteArrayToBigInt(compressedDataBytes)
  return compressedBigInt
}