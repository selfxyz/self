uniffi::build_foreign_language_testcases!(
    "tests/bindings/test_mopro.swift",
    "tests/bindings/test_mopro.kts",
    //    "tests/bindings/test_mopro.rb",
    //    "tests/bindings/test_mopro.py",
    "tests/bindings/test_mopro_keccak.swift",
    // "tests/bindings/test_mopro_keccak.kts", // FIXME: java.lang.OutOfMemoryError: Java heap space
    "tests/bindings/test_mopro_keccak2.swift",
    "tests/bindings/test_mopro_keccak2.kts",
    "tests/bindings/test_mopro_rsa.swift",
    // "tests/bindings/test_mopro_rsa.kts", // FIXME: java.lang.OutOfMemoryError: Java heap space
    // "tests/bindings/test_mopro_rsa2.swift",
);
