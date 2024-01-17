fn main() {
    uniffi::generate_scaffolding("src/mopro.udl").expect("Building the UDL file failed");
}
