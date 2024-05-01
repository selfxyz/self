import {
  NativeModules,
  Platform,
} from 'react-native';
import RNFS from 'react-native-fs';
import { ARKZKEY_URL, ZKEY_NAME, ZKEY_URL } from '../../../common/src/constants/constants';
import * as amplitude from '@amplitude/analytics-react-native';
import NetInfo from '@react-native-community/netinfo';
import axios from 'axios';
import { unzip } from 'react-native-zip-archive';

const localZkeyPath = RNFS.DocumentDirectoryPath + '/proof_of_passport.zkey';
const localZipPath = RNFS.DocumentDirectoryPath + '/proof_of_passport.zip';
const localUrlPath = RNFS.DocumentDirectoryPath + '/zkey_url.txt';

async function initMopro() {
  if (Platform.OS === 'android') {
    const res = await NativeModules.Prover.runInitAction()
    console.log('Mopro init res:', res)
  }
}

export async function downloadZkey(
  setDownloadStatus: (value:  "not_started" | "downloading" | "completed" | "error") => void,
  toast: any
) {
  console.log('launching zkey download')
  setDownloadStatus('downloading');
  amplitude.track('Downloading zkey...');
  const startTime = Date.now();

  const url = Platform.OS === 'android' ? ARKZKEY_URL : ZKEY_URL

  let previousPercentComplete = -1;

  const options = {
    fromUrl: url,
    toFile: localZipPath,
    background: true,
    begin: () => {
      console.log('Download has begun');
    },
    progress: (res: any) => {
      const percentComplete = Math.floor((res.bytesWritten / res.contentLength) * 100);
      if (percentComplete !== previousPercentComplete) {
        console.log(`${percentComplete}%`);
        previousPercentComplete = percentComplete;
      }
    },
  };

  RNFS.downloadFile(options).promise
    .then(async () => {
      console.log('Download complete');
      RNFS.readDir(RNFS.DocumentDirectoryPath)
        .then((result) => {
          console.log('Directory contents before:', result);
        })

      const unzipPath = RNFS.DocumentDirectoryPath;
      await unzip(localZipPath, unzipPath);
      const oldPath = `${unzipPath}/${ZKEY_NAME}${Platform.OS === 'android' ? '.arkzkey' : '.zkey'}`;
      const newPath = `${unzipPath}/proof_of_passport.zkey`;
      await RNFS.moveFile(oldPath, newPath);
      RNFS.readDir(RNFS.DocumentDirectoryPath)
      .then((result) => {
        console.log('Directory contents after:', result);
      })
      console.log('Unzip complete');
      setDownloadStatus('completed')
      const endTime = Date.now();
      amplitude.track('zkey download succeeded, took ' + ((endTime - startTime) / 1000) + ' seconds');
      RNFS.writeFile(localUrlPath, url, 'utf8');
      initMopro()
    })
    .catch((error) => {
      console.error(error);
      setDownloadStatus('error');
      amplitude.track('zkey download failed: ' + error.message);
      toast.show('Error', {
        message: `Error: ${error.message}`,
        customData: {
          type: "error",
        },
      });
    });
}

interface CheckForZkeyProps {
  setDownloadStatus: (value: "not_started" | "downloading" | "completed" | "error") => void;
  setShowWarning: (value: boolean) => void;
  toast: any
}

export async function checkForZkey({
  setDownloadStatus,
  setShowWarning,
  toast
}: CheckForZkeyProps) {
  console.log('local zkey path:', localZkeyPath)
  const url = Platform.OS === 'android' ? ARKZKEY_URL : ZKEY_URL

  let storedUrl = '';
  try {
    storedUrl = await RNFS.readFile(localUrlPath, 'utf8');
  } catch (error) {
    console.log('zkey_url.txt file not found, so assuming zkey is outdated.');
  }

  const fileExists = await RNFS.exists(localZkeyPath);
  const fileInfo = fileExists ? await RNFS.stat(localZkeyPath) : null;

  const response = await axios.head(url);
  const expectedSize = parseInt(response.headers['content-length'], 10);
  const isFileComplete = fileInfo && fileInfo.size === expectedSize;

  console.log('expectedSize:', expectedSize)
  console.log('fileInfo.size:', fileInfo?.size)
  console.log('isFileComplete:', isFileComplete)

  if (!isFileComplete || url !== storedUrl) {
    const state = await NetInfo.fetch();
    console.log('Network start type:', state.type)
    if (state.type === 'wifi') {
      downloadZkey(
        setDownloadStatus,
        toast
      )
    } else {
      setShowWarning(true);
    }
  } else {
    console.log('zkey already downloaded')
    amplitude.track('zkey already downloaded');
    setDownloadStatus('completed');
    initMopro()
  }
}
