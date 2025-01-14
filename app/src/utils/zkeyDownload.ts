import RNFS from 'react-native-fs';
import NetInfo from '@react-native-community/netinfo';
import axios from 'axios';
import { unzip } from 'react-native-zip-archive';
import useNavigationStore from '../stores/navigationStore';

const zkeyZipUrls = {
  prove_rsa_65537_sha256:
    'https://d8o9bercqupgk.cloudfront.net/staging/prove_rsa_65537_sha256.zkey.zip',
  prove_rsa_65537_sha1:
    'https://d8o9bercqupgk.cloudfront.net/staging/prove_rsa_65537_sha1.zkey.zip',
  prove_rsapss_65537_sha256:
    'https://d8o9bercqupgk.cloudfront.net/staging/prove_rsapss_65537_sha256.zkey.zip',
  // register_sha256WithRSAEncryption_65537: "https://d8o9bercqupgk.cloudfront.net/staging/register_sha256WithRSAEncryption_65537_csca2.zkey.zip",
  // disclose: "https://d8o9bercqupgk.cloudfront.net/staging/disclose3.zkey.zip",
  vc_and_disclose:
    'https://d8o9bercqupgk.cloudfront.net/staging/vc_and_disclose.zkey.zip',
};

const datZipUrls = {
  prove_rsa_65537_sha256:
    'https://d8o9bercqupgk.cloudfront.net/staging/prove_rsa_65537_sha256.dat.zip',
  prove_rsa_65537_sha1:
    'https://d8o9bercqupgk.cloudfront.net/staging/prove_rsa_65537_sha1.dat.zip',
  prove_rsapss_65537_sha256:
    'https://d8o9bercqupgk.cloudfront.net/staging/prove_rsapss_65537_sha256.dat.zip',
  vc_and_disclose:
    'https://d8o9bercqupgk.cloudfront.net/staging/vc_and_disclose.dat.zip',
};

export type CircuitName = keyof typeof zkeyZipUrls;

export type ShowWarningModalProps = {
  show: boolean;
  circuit: CircuitName | '';
  size: number;
};

export type IsZkeyDownloading = {
  [circuit in CircuitName]: boolean;
};

// each time we download a zkey, we store the size of the zip file in a file named <circuit_name>_zip_size.txt
// we assume a new zkey zip will always have a different size

// the downloadZkey function downloads a zkey if either:
// 1. the zkey file does not exist
// 2. <circuit_name>_zip_size.txt does not show the same size as the server response (zkey is outdated)
// 3. the zkey is currently downloading
// 4. the commitment is already registered and the function is called for a register zkey. If it's the case, there is no need to download the latest zkey.
// => this should be fine is the function is never called after the commitment is registered.

export async function downloadZkey(circuit: CircuitName) {
  const { isZkeyDownloading, update, trackEvent } = useNavigationStore.getState();
  const startTime = Date.now();

  trackEvent('Download Started', {
    success: true,
    circuit: circuit,
  });

  const downloadRequired = await isDownloadRequired(circuit, isZkeyDownloading);
  if (!downloadRequired) {
    trackEvent('Download Skipped', {
      success: true,
      circuit: circuit,
      reason: 'already_downloaded'
    });
    return;
  }

  try {
    const networkInfo = await NetInfo.fetch();
    if (networkInfo.type === 'wifi') {
      fetchZkeyAndDat(circuit);
    } else {
      const zkeyResponse = await axios.head(zkeyZipUrls[circuit]);
      const datResponse = await axios.head(datZipUrls[circuit]);
      const expectedSize =
        parseInt(zkeyResponse.headers['content-length'], 10) +
        parseInt(datResponse.headers['content-length'], 10);

      update({
        showWarningModal: {
          show: true,
          circuit: circuit,
          size: expectedSize,
        },
      });

      trackEvent('Download Paused', {
        success: true,
        circuit: circuit,
        reason: 'no_wifi',
        expected_size: expectedSize
      });
    }
  } catch (error: any) {
    trackEvent('Download Failed', {
      success: false,
      error: error.message,
      circuit: circuit,
      duration_ms: Date.now() - startTime
    });
    throw error;
  }
}

export async function isDownloadRequired(
  circuit: CircuitName,
  isZkeyDownloading: IsZkeyDownloading,
) {
  if (isZkeyDownloading[circuit]) {
    return false;
  }

  const zkeyExists = await RNFS.exists(
    `${RNFS.DocumentDirectoryPath}/${circuit}.zkey`,
  );
  const datExists = await RNFS.exists(
    `${RNFS.DocumentDirectoryPath}/${circuit}.dat`,
  );
  if (!zkeyExists || !datExists) {
    return true;
  }

  let storedZkeyZipSize = 0;
  let storedDatZipSize = 0;
  try {
    storedZkeyZipSize = Number(
      await RNFS.readFile(
        `${RNFS.DocumentDirectoryPath}/${circuit}_zkey_zip_size.txt`,
        'utf8',
      ),
    );
    storedDatZipSize = Number(
      await RNFS.readFile(
        `${RNFS.DocumentDirectoryPath}/${circuit}_dat_zip_size.txt`,
        'utf8',
      ),
    );
  } catch (error) {
    console.log(
      `Size files not found for ${circuit}, assuming files are outdated.`,
    );
    return true;
  }

  const zkeyResponse = await axios.head(zkeyZipUrls[circuit]);
  const datResponse = await axios.head(datZipUrls[circuit]);
  const expectedZkeySize = parseInt(zkeyResponse.headers['content-length'], 10);
  const expectedDatSize = parseInt(datResponse.headers['content-length'], 10);

  return (
    storedZkeyZipSize !== expectedZkeySize ||
    storedDatZipSize !== expectedDatSize
  );
}

export async function fetchZkeyAndDat(circuit: CircuitName) {
  const startTime = Date.now();
  const { isZkeyDownloading, toast, update, setZkeyDownloadedPercentage, trackEvent } = useNavigationStore.getState();

  trackEvent('Files Download Started', {
    success: true,
    circuit: circuit
  });

  update({
    isZkeyDownloading: {
      ...isZkeyDownloading,
      [circuit]: true,
    },
  });

  let previousPercentComplete = -1;

  const downloadFile = async (url: string, fileName: string) => {
    const options = {
      fromUrl: url,
      toFile: `${RNFS.DocumentDirectoryPath}/${fileName}`,
      background: false,
      begin: () => {
        trackEvent('File Download Started', {
          success: true,
          circuit: circuit,
          file_type: fileName.includes('zkey') ? 'zkey' : 'dat'
        });
      },
      progress: (res: any) => {
        if (fileName.endsWith('.zkey.zip')) {
          const percentComplete = Math.floor(
            (res.bytesWritten / res.contentLength) * 100,
          );
          if (percentComplete % 5 === 0 && percentComplete !== previousPercentComplete) {
            previousPercentComplete = percentComplete;
            setZkeyDownloadedPercentage(percentComplete);
          }
        }
      },
    };

    await RNFS.downloadFile(options).promise;

    trackEvent('File Download Completed', {
      success: true,
      circuit: circuit,
      file_type: fileName.includes('zkey') ? 'zkey' : 'dat'
    });
  };

  try {
    await downloadFile(datZipUrls[circuit], `${circuit}.dat.zip`);
    await downloadFile(zkeyZipUrls[circuit], `${circuit}.zkey.zip`);

    await unzipFile(circuit, 'dat');
    await unzipFile(circuit, 'zkey');

    update({
      isZkeyDownloading: {
        ...isZkeyDownloading,
        [circuit]: false,
      },
    });

    await saveFileSize(circuit, 'zkey');
    await saveFileSize(circuit, 'dat');

    await RNFS.unlink(`${RNFS.DocumentDirectoryPath}/${circuit}.zkey.zip`);
    await RNFS.unlink(`${RNFS.DocumentDirectoryPath}/${circuit}.dat.zip`);

    trackEvent('Files Download Completed', {
      success: true,
      circuit: circuit,
      duration_ms: Date.now() - startTime
    });

  } catch (error: any) {
    update({
      isZkeyDownloading: {
        ...isZkeyDownloading,
        [circuit]: false,
      },
    });

    trackEvent('Files Download Failed', {
      success: false,
      error: error.message,
      circuit: circuit,
      duration_ms: Date.now() - startTime
    });

    toast.show('Error', {
      message: `Error: ${error.message}`,
      customData: { type: 'error' },
    });
  }
}

async function unzipFile(circuit: CircuitName, fileType: 'zkey' | 'dat') {
  const { trackEvent } = useNavigationStore.getState();
  const startTime = Date.now();

  trackEvent('File Unzip Started', {
    success: true,
    circuit: circuit,
    file_type: fileType
  });

  try {
    const unzipPath = `${RNFS.DocumentDirectoryPath}/${circuit}_temp`;
    await unzip(
      `${RNFS.DocumentDirectoryPath}/${circuit}.${fileType}.zip`,
      unzipPath,
    );
    const files = await RNFS.readDir(unzipPath);
    const targetFile = files.find(file => file.name.endsWith(`.${fileType}`));
    if (targetFile) {
      const destinationPath = `${RNFS.DocumentDirectoryPath}/${circuit}.${fileType}`;
      if (await RNFS.exists(destinationPath)) {
        await RNFS.unlink(destinationPath);
        console.log(`Old ${fileType} file deleted`);
      }
      await RNFS.moveFile(targetFile.path, destinationPath);
      console.log(`File moved to ${circuit}.${fileType}`);
    } else {
      throw new Error(
        `${fileType.toUpperCase()} file not found in the unzipped directory`,
      );
    }
    await RNFS.unlink(unzipPath);

    trackEvent('File Unzip Completed', {
      success: true,
      circuit: circuit,
      file_type: fileType,
      duration_ms: Date.now() - startTime
    });
  } catch (error: any) {
    trackEvent('File Unzip Failed', {
      success: false,
      error: error.message,
      circuit: circuit,
      file_type: fileType,
      duration_ms: Date.now() - startTime
    });
    throw error;
  }
}

async function saveFileSize(circuit: CircuitName, fileType: 'zkey' | 'dat') {
  const zipSize = await RNFS.stat(
    `${RNFS.DocumentDirectoryPath}/${circuit}.${fileType}.zip`,
  );
  await RNFS.writeFile(
    `${RNFS.DocumentDirectoryPath}/${circuit}_${fileType}_zip_size.txt`,
    zipSize.size.toString(),
    'utf8',
  );
  console.log(`${fileType} zip size written to file`);
}
