use std::env;
use std::path::{Path, PathBuf};

extern crate ark_zkey;
use ark_zkey::{convert_zkey, read_proving_key_and_matrices_from_zkey};

fn main() -> color_eyre::eyre::Result<()> {
    color_eyre::install()?;

    let args: Vec<String> = env::args().collect();
    if args.len() != 2 {
        eprintln!("Usage: zkey_to_arkzkey <path_to_zkey_file>");
        std::process::exit(1);
    }

    let zkey_path = &args[1];
    let (proving_key, constraint_matrices) = read_proving_key_and_matrices_from_zkey(zkey_path)?;

    let arkzkey_path = get_arkzkey_path(zkey_path);
    let arkzkey_path_str = arkzkey_path
        .to_str()
        .ok_or_else(|| color_eyre::eyre::eyre!("Failed to convert arkzkey path to string"))?;

    convert_zkey(proving_key, constraint_matrices, &arkzkey_path_str)?;

    println!("Converted zkey file saved to: {}", arkzkey_path.display());

    Ok(())
}

fn get_arkzkey_path(zkey_path: &str) -> PathBuf {
    let path = Path::new(zkey_path);
    let mut arkzkey_path = path.to_path_buf();
    arkzkey_path.set_extension("arkzkey");
    arkzkey_path
}
