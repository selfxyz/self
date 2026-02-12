plugins {
    alias(libs.plugins.androidLibrary)
    alias(libs.plugins.kotlinMultiplatform)
    alias(libs.plugins.kotlinSerialization)
}

kotlin {
    androidTarget {
        compilations.all {
            kotlinOptions {
                jvmTarget = "17"
            }
        }
    }

    sourceSets {
        androidMain.dependencies {
            implementation(project(":shared"))
            implementation(libs.kotlinx.coroutines.android)
            implementation(libs.kotlinx.serialization.json)
            implementation(libs.jmrtd)
            implementation(libs.scuba.sc.android)
            implementation(libs.androidx.biometric)
            implementation(libs.androidx.security.crypto)
            implementation(libs.androidx.webkit)
            implementation(libs.androidx.activity)
            implementation(libs.androidx.fragment)
            implementation(libs.androidx.appcompat)
            implementation(libs.mlkit.text.recognition)
        }
    }
}

configurations.all {
    resolutionStrategy {
        force("net.sf.scuba:scuba-smartcards:0.0.18")
    }
}

android {
    namespace = "xyz.self.sdk.android"
    compileSdk = libs.versions.android.compileSdk.get().toInt()

    defaultConfig {
        minSdk = libs.versions.android.minSdk.get().toInt()
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
}
