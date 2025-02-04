import { extractMasterlistCsca } from './csca/extract_masterlist_csca';
import { extractMasterlistDsc } from './dsc/extract_masterlist_dsc';

async function extractMasterList(type: string) {
    switch (type) {
        case 'dsc':
            await extractMasterlistDsc();
            break;
        case 'csca':
            await extractMasterlistCsca();
            break;
        case 'all':
            await extractMasterlistCsca();
            await extractMasterlistDsc();
            break;
        default:
            console.error('Invalid parameter. Use "dsc", "csca", or "all".');
    }
}

// Get the command line argument
const arg = process.argv[2];

// Call the function with the provided argument
extractMasterList(arg);