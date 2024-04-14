import {
  NativeModules,
  Platform,
} from 'react-native';
import RNFS from 'react-native-fs';
import { ARKZKEY_URL, ZKEY_URL } from '../../../common/src/constants/constants';
import * as amplitude from '@amplitude/analytics-react-native';
import NetInfo from '@react-native-community/netinfo';
import axios from 'axios';

const localZkeyPath = RNFS.DocumentDirectoryPath + '/proof_of_passport.zkey';

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

  let previousPercentComplete = -1;

  const options = {
    // @ts-ignore
    fromUrl: Platform.OS === 'android' ? ARKZKEY_URL : ZKEY_URL,
    toFile: localZkeyPath,
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
    .then(() => {
      setDownloadStatus('completed')
      console.log('Download complete');
      amplitude.track('zkey download succeeded');
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
  
  const fileExists = await RNFS.exists(localZkeyPath);
  const fileInfo = fileExists ? await RNFS.stat(localZkeyPath) : null;

  const response = await axios.head(Platform.OS === 'android' ? ARKZKEY_URL : ZKEY_URL);
  const expectedSize = parseInt(response.headers['content-length'], 10);
  const isFileComplete = fileInfo && fileInfo.size === expectedSize;

  console.log('expectedSize:', expectedSize)
  console.log('fileInfo.size:', fileInfo?.size)
  console.log('isFileComplete:', isFileComplete)

  if (!isFileComplete) {
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
