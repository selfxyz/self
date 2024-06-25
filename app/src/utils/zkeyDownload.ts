import RNFS from 'react-native-fs';
import * as amplitude from '@amplitude/analytics-react-native';
import NetInfo from '@react-native-community/netinfo';
import axios from 'axios';
import { unzip } from 'react-native-zip-archive';
import useNavigationStore from '../stores/navigationStore';

const zkeyZipUrls = {
  register_sha256WithRSAEncryption_65537: "https://d8o9bercqupgk.cloudfront.net/register_sha256WithRSAEncryption_65537_csca.zkey.zip",
  disclose: "https://d8o9bercqupgk.cloudfront.net/disclose2.zkey.zip",
};

export type CircuitName = keyof typeof zkeyZipUrls;

export type ShowWarningModalProps = {
  show: boolean,
  circuit: CircuitName | "",
  size: number,
}

export type IsZkeyDownloading = {
  [circuit in CircuitName]: boolean;
}

// each time we download a zkey, we store the size of the zip file in a file named <circuit_name>_zip_size.txt
// we assume a new zkey zip will always have a different size

// the downloadZkey function downloads a zkey if either:
// 1. the zkey file does not exist
// 2. <circuit_name>_zip_size.txt does not show the same size as the server response (zkey is outdated)
// 3. the zkey is currently downloading
// 4. the commitment is already registered and the function is called for a register zkey. If it's the case, there is no need to download the latest zkey.
// => this should be fine is the function is never called after the commitment is registered.

export async function downloadZkey(
  circuit: CircuitName,
) {
  const {
    isZkeyDownloading,
    update
  } = useNavigationStore.getState();

  const downloadRequired = await isDownloadRequired(circuit, isZkeyDownloading);
  if (!downloadRequired) {
    console.log(`zkey for ${circuit} already downloaded`)
    amplitude.track(`zkey for ${circuit} already downloaded`);
    return;
  }

  const networkInfo = await NetInfo.fetch();
  console.log('Network type:', networkInfo.type)
  if (networkInfo.type === 'wifi') { //todo: no need to check for register circuit as zkey is smol
    fetchZkey(circuit);
  } else {
    const response = await axios.head(zkeyZipUrls[circuit]);
    const expectedSize = parseInt(response.headers['content-length'], 10);

    update({
      showWarningModal: {
        show: true,
        circuit: circuit,
        size: expectedSize,
      }
    });
  }
}

export async function isDownloadRequired(
  circuit: CircuitName,
  isZkeyDownloading: IsZkeyDownloading
) {
  if (isZkeyDownloading[circuit]) {
    return false;
  }

  const fileExists = await RNFS.exists(`${RNFS.DocumentDirectoryPath}/${circuit}.zkey`);
  if (!fileExists) {
    return true;
  }

  let storedZipSize = 0;
  try {
    storedZipSize = Number(await RNFS.readFile(`${RNFS.DocumentDirectoryPath}/${circuit}_zip_size.txt`, 'utf8'));
  } catch (error) {
    console.log(`${circuit}_zip_size.txt file not found, so assuming zkey is outdated.`);
    return true;
  }

  console.log('storedZipSize:', storedZipSize)

  const response = await axios.head(zkeyZipUrls[circuit]);
  const expectedSize = parseInt(response.headers['content-length'], 10);

  console.log('expectedSize:', expectedSize)

  const isZipComplete = storedZipSize === expectedSize;

  console.log('isZipComplete:', isZipComplete)

  if (!isZipComplete) {
    return true;
  }
  return false
}

export async function fetchZkey(
  circuit: CircuitName,
) {
  console.log(`fetching zkey for ${circuit} ...`)
  amplitude.track(`fetching zkey for ${circuit} ...`);

  const {
    isZkeyDownloading,
    toast,
    update
  } = useNavigationStore.getState();

  update({
    isZkeyDownloading: {
      ...isZkeyDownloading,
      [circuit]: true,
    }
  });

  const startTime = Date.now();
  let previousPercentComplete = -1;
  const options = {
    fromUrl: zkeyZipUrls[circuit],
    toFile: `${RNFS.DocumentDirectoryPath}/${circuit}.zkey.zip`,
    background: true,
    begin: () => {
      console.log('Download has begun');
    },
    progress: (res: any) => {
      const percentComplete = Math.floor((res.bytesWritten / res.contentLength) * 100);
      if (percentComplete % 5 === 0 && percentComplete !== previousPercentComplete) {
        console.log(`${percentComplete}%`);
        previousPercentComplete = percentComplete;
      }
    }
  };

  RNFS.downloadFile(options).promise
    .then(async () => {
      console.log('Download complete');

      RNFS.readDir(RNFS.DocumentDirectoryPath)
        .then((result) => {
          console.log('Directory contents before unzipping:', result);
        })

      // this trick makes sure the zkey ends up being named <circuit>.zkey
      const unzipPath = `${RNFS.DocumentDirectoryPath}/${circuit}_temp`;
      await unzip(`${RNFS.DocumentDirectoryPath}/${circuit}.zkey.zip`, unzipPath);
      const files = await RNFS.readDir(unzipPath);
      const zkeyFile = files.find(file => file.name.endsWith('.zkey'));
      if (zkeyFile) {
        await RNFS.moveFile(zkeyFile.path, `${RNFS.DocumentDirectoryPath}/${circuit}.zkey`);
        console.log(`File renamed to ${circuit}.zkey`);
      } else {
        throw new Error('Zkey file not found in the unzipped directory');
      }
      await RNFS.unlink(unzipPath);

      console.log('Unzip complete');

      update({
        isZkeyDownloading: {
          ...isZkeyDownloading,
          [circuit]: false,
        }
      });

      amplitude.track('zkey download succeeded, took ' + ((Date.now() - startTime) / 1000) + ' seconds');

      const zipSize = await RNFS.stat(`${RNFS.DocumentDirectoryPath}/${circuit}.zkey.zip`);
      console.log('zipSize:', zipSize.size);

      RNFS.writeFile(`${RNFS.DocumentDirectoryPath}/${circuit}_zip_size.txt`, zipSize.size.toString(), 'utf8');
      console.log('zip size written to file');

      // delete the zip file
      RNFS.unlink(`${RNFS.DocumentDirectoryPath}/${circuit}.zkey.zip`)
        .then(() => {
          console.log('zip file deleted');
        })
        .catch((error) => {
          console.error(error);
        });

      RNFS.readDir(RNFS.DocumentDirectoryPath)
        .then((result) => {
          console.log('Directory contents at the end:', result);
        })

    })
    .catch((error) => {
      console.error(error);
      update({
        isZkeyDownloading: {
          ...isZkeyDownloading,
          [circuit]: false,
        }
      });
      amplitude.track('zkey download failed: ' + error.message);
      toast?.show('Error', {
        message: `Error: ${error.message}`,
        customData: {
          type: "error",
        },
      });
    });
}