import fs from 'fs';
import path from 'path';
import { getRegistryJson } from './utils/getRegistryJson';
import { getMapJson } from './utils/getMapJson';
import { getSkiModulusJson } from './utils/getSkiModulusJson';

const csca_pem_directory_path = path.join(__dirname, '..', 'outputs', 'unique_pem_masterlist');
const dsc_pem_directory_path = path.join(__dirname, '..', 'outputs', 'dsc', 'pem_masterlist');

const searchable_registry_csca_path = path.join(__dirname, '..', 'outputs', 'searchable_registry_csca.json');
const searchable_registry_dsc_path = path.join(__dirname, '..', 'outputs', 'searchable_registry_dsc.json');

const map_csca_path = path.join(__dirname, '..', 'outputs', 'map_csca.json');
const map_dsc_path = path.join(__dirname, '..', 'outputs', 'map_dsc.json');
const ski_modulus_path = path.join(__dirname, '..', 'outputs', 'ski_modulus.json');
async function main() {

    console.log('\x1b[32m', 'building SKI modulus JSON', '\x1b[0m');
    const skiModulusJson = await getSkiModulusJson(csca_pem_directory_path);
    fs.writeFileSync(ski_modulus_path, JSON.stringify(skiModulusJson, null, 2));


    console.log('\x1b[32m', 'building searchable registry JSON', '\x1b[0m');
    const searchable_registry_csca = await getRegistryJson(csca_pem_directory_path);
    fs.writeFileSync(searchable_registry_csca_path, JSON.stringify(searchable_registry_csca, null, 2));

    const searchable_registry_dsc = await getRegistryJson(dsc_pem_directory_path);
    fs.writeFileSync(searchable_registry_dsc_path, JSON.stringify(searchable_registry_dsc, null, 2));

    console.log('\x1b[32m', 'building map JSON', '\x1b[0m');
    const map_csca = await getMapJson(csca_pem_directory_path);
    fs.writeFileSync(map_csca_path, JSON.stringify(map_csca, null, 2));

    const map_dsc = await getMapJson(dsc_pem_directory_path);
    fs.writeFileSync(map_dsc_path, JSON.stringify(map_dsc, null, 2));
}

main().catch(console.error);
