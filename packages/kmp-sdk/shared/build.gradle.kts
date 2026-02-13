import org.jetbrains.kotlin.gradle.dsl.JvmTarget

plugins {
    alias(libs.plugins.kotlinMultiplatform)
    alias(libs.plugins.kotlinSerialization)
    alias(libs.plugins.androidLibrary)
}

group = "xyz.self.sdk"
version = "0.1.0"

kotlin {
    jvm() // For unit tests on host

    androidTarget {
        compilerOptions {
            jvmTarget.set(JvmTarget.JVM_17)
        }
    }

    iosArm64()
    iosSimulatorArm64()

    listOf(iosArm64(), iosSimulatorArm64()).forEach {
        it.binaries.framework {
            baseName = "SelfSdk"
            isStatic = true
        }
    }

    sourceSets {
        commonMain.dependencies {
            implementation(libs.kotlinx.coroutines.core)
            implementation(libs.kotlinx.serialization.json)
        }
        commonTest.dependencies {
            implementation(libs.kotlin.test)
            implementation(libs.kotlinx.coroutines.test)
        }
        androidMain.dependencies {
            // NFC / Passport reading
            implementation("org.jmrtd:jmrtd:0.8.1")
            implementation("net.sf.scuba:scuba-sc-android:0.0.18")
            implementation("org.bouncycastle:bcprov-jdk18on:1.78.1")
            implementation("commons-io:commons-io:2.14.0")
            // Camera / MRZ scanning
            implementation("com.google.mlkit:text-recognition:16.0.1")
            implementation("androidx.camera:camera-core:1.4.1")
            implementation("androidx.camera:camera-camera2:1.4.1")
            implementation("androidx.camera:camera-lifecycle:1.4.1")
            implementation("androidx.camera:camera-view:1.4.1")
        }
    }
}

android {
    namespace = "xyz.self.sdk"
    compileSdk = libs.versions.android.compileSdk.get().toInt()
    defaultConfig {
        minSdk = libs.versions.android.minSdk.get().toInt()
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
}
