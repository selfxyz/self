###

#Build targets
host:
	rm -rf build_witnesscalc && mkdir build_witnesscalc && cd build_witnesscalc && \
	cmake .. -DCMAKE_BUILD_TYPE=Release -DCMAKE_INSTALL_PREFIX=../package && \
	make -j4 -vvv && make install

arm64_host:
	rm -rf build_witnesscalc && mkdir build_witnesscalc && cd build_witnesscalc && \
	cmake .. -DTARGET_PLATFORM=arm64_host -DCMAKE_BUILD_TYPE=Release -DCMAKE_INSTALL_PREFIX=../package && \
	make -j4 -vvv && make install

android:
	rm -rf build_witnesscalc_android && mkdir build_witnesscalc_android && cd build_witnesscalc_android && \
	cmake .. -DTARGET_PLATFORM=ANDROID -DCMAKE_BUILD_TYPE=Release -DCMAKE_INSTALL_PREFIX=../package_android && \
	make -j4 -vvv && make install

android_x86_64:
	rm -rf build_witnesscalc_android_x86_64 && mkdir build_witnesscalc_android_x86_64 && cd build_witnesscalc_android_x86_64 && \
	cmake .. -DTARGET_PLATFORM=ANDROID_x86_64 -DCMAKE_BUILD_TYPE=Release -DCMAKE_INSTALL_PREFIX=../package_android_x86_64 && \
	make -j4 -vvv && make install

ios:
	rm -rf build_witnesscalc_ios && mkdir build_witnesscalc_ios && cd build_witnesscalc_ios && \
	cmake .. -GXcode -DTARGET_PLATFORM=IOS -DCMAKE_BUILD_TYPE=Release -DCMAKE_INSTALL_PREFIX=../package_ios && \
    echo "" && echo "Now open Xcode and compile the generated project" && echo ""

ios_x86_64:
	rm -rf build_witnesscalc_ios_x86_64 && mkdir build_witnesscalc_ios_x86_64 && cd build_witnesscalc_ios_x86_64 && \
	cmake .. -GXcode -DTARGET_PLATFORM=IOS_x86_64 -DCMAKE_BUILD_TYPE=Release -DCMAKE_INSTALL_PREFIX=../package_ios_x86_64 && \
    echo "" && echo "Now open Xcode and compile the generated project" && echo ""

