
# react-native-passport-reader

Adapted from [passport-reader](https://github.com/tananaev/passport-reader). Individual modifications are too many to enumerate, but essentially: the workflow code was adapted to the needs of a React Native module, and the scanning code was largely left as is.

## Getting started

```sh
$ npm install react-native-passport-reader --save
$ react-native link react-native-passport-reader
```

In your `android/app/build.gradle` add `packagingOptions`:

```
android {
    ...
    packagingOptions {
        exclude 'META-INF/LICENSE'
        exclude 'META-INF/NOTICE'
    }
}
```

In `AndroidManifest.xml` add:

```xml
<uses-permission android:name="android.permission.CAMERA" />
<uses-feature android:name="android.hardware.nfc" android:required="false" />
```

If your app will not function without nfc capabilities, set `android:required` above to `true`

## Usage
```js
import PassportReader from 'react-native-passport-reader'
// { scan, cancel, isSupported }

async function scan () {
  // 1. start a scan
  // 2. press the back of your android phone against the passport
  // 3. wait for the scan(...) Promise to get resolved/rejected

  const { 
    firstName, 
    lastName, 
    gender, 
    issuer, 
    nationality, 
    photo 
  } = await PassportReader.scan({
    // yes, you need to know a bunch of data up front
    // this is data you can get from reading the MRZ zone of the passport
    documentNumber: 'ofDocumentBeingScanned',
    dateOfBirth: 'yyMMdd',
    dateOfExpiry: 'yyMMdd'
  })

  const { base64, width, height } = photo
}
```
